/* ============================================================
   strength.ts — guess-estimation engine (zxcvbn-grade, self-contained).

   Models how a real attacker cracks a password rather than counting naive
   charset entropy. It searches for the patterns an attacker would exploit —
   dictionary words (incl. reversed and l33t-speak), keyboard walks, repeats,
   sequences, dates and years — then finds, by dynamic programming, the
   *cheapest* way to express the whole password as a chain of such patterns
   (an attacker always takes the weakest path). Anything left unexplained is
   charged at true brute force over the password's actual character set.

   The result is an estimated number of guesses, which we turn into bits and
   into crack times across five attack scenarios (rate-limited online up to an
   offline GPU farm). Pure & local — no network, nothing persisted.

   Math is principled (closely follows Wheeler/Dropbox's zxcvbn model) and
   deliberately re-derived per explicit request, superseding the old port.
   ============================================================ */

import { DICTIONARIES, KEYBOARDS, L33T_TABLE } from './strength-data';
import { crackScenarios, type Scenario } from './format';

export type { Scenario };

const REFERENCE_YEAR = new Date().getFullYear();
const MIN_YEAR_SPACE = 20;
const MIN_GUESSES_BEFORE_GROWING_SEQUENCE = 10000;
const MIN_SUBMATCH_GUESSES_SINGLE_CHAR = 10;
const MIN_SUBMATCH_GUESSES_MULTI_CHAR = 50;

export type Pattern =
  | 'dictionary' | 'spatial' | 'repeat' | 'sequence' | 'regex' | 'date' | 'bruteforce';

interface Match {
  pattern: Pattern;
  i: number;
  j: number;
  token: string;
  guesses?: number;
  // dictionary
  matchedWord?: string;
  rank?: number;
  dictionaryName?: string;
  reversed?: boolean;
  l33t?: boolean;
  sub?: Record<string, string>;
  // spatial
  graph?: string;
  turns?: number;
  shiftedCount?: number;
  // repeat
  baseToken?: string;
  baseGuesses?: number;
  repeatCount?: number;
  // sequence
  ascending?: boolean;
  sequenceName?: string;
  // regex / date
  regexName?: string;
  year?: number;
  separator?: string;
}

export interface PublicMatch {
  pattern: Pattern;
  token: string;
  guesses: number;
  bits: number;
  detail: string;
}

export interface Strength {
  password: string;
  guesses: number;
  bits: number;
  score: number; // 0..4
  cardinality: number;
  sequence: PublicMatch[];
  scenarios: Scenario[];
  feedback: { warning: string; suggestions: string[] };
}

// --- small math helpers ----------------------------------------------
function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
const log2 = (x: number) => Math.log2(Math.max(x, 1));

function calcCardinality(pw: string): number {
  let c = 0;
  if (/[a-z]/.test(pw)) c += 26;
  if (/[A-Z]/.test(pw)) c += 26;
  if (/[0-9]/.test(pw)) c += 10;
  if (/[^a-zA-Z0-9\s]/.test(pw)) c += 33; // ASCII punctuation / symbols
  if (/\s/.test(pw)) c += 1;
  if (/[^\x00-\x7F]/.test(pw)) c += 100; // non-ASCII / unicode
  return Math.max(c, 10);
}

// =====================================================================
//  Matchers
// =====================================================================

function dictionaryMatch(password: string): Match[] {
  const out: Match[] = [];
  const lower = password.toLowerCase();
  const n = password.length;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const word = lower.slice(i, j + 1);
      for (const dict of DICTIONARIES) {
        const rank = dict.ranks.get(word);
        if (rank) {
          out.push({
            pattern: 'dictionary', i, j, token: password.slice(i, j + 1),
            matchedWord: word, rank, dictionaryName: dict.name, reversed: false, l33t: false,
          });
        }
      }
    }
  }
  return out;
}

function reverseDictionaryMatch(password: string): Match[] {
  const n = password.length;
  const reversed = [...password].reverse().join('');
  return dictionaryMatch(reversed).map((m) => ({
    ...m,
    token: [...m.token].reverse().join(''),
    reversed: true,
    i: n - 1 - m.j,
    j: n - 1 - m.i,
  }));
}

function l33tMatch(password: string): Match[] {
  const out: Match[] = [];
  const ciphers = [...new Set([...password])].filter((c) => L33T_TABLE[c]);
  if (ciphers.length === 0) return out;

  // Cartesian product of substitution choices, capped to keep it cheap.
  let combos: Record<string, string>[] = [{}];
  for (const c of ciphers) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const letter of L33T_TABLE[c]) {
        next.push({ ...combo, [c]: letter });
        if (next.length >= 64) break;
      }
      if (next.length >= 64) break;
    }
    combos = next;
  }

  const seen = new Set<string>();
  for (const combo of combos) {
    const translated = [...password].map((ch) => (combo[ch] !== undefined ? combo[ch] : ch)).join('');
    if (!/[a-z]/i.test(translated)) continue;
    for (const dm of dictionaryMatch(translated)) {
      const usedSubs: Record<string, string> = {};
      let hasSub = false;
      for (let p = dm.i; p <= dm.j; p++) {
        const ch = password[p];
        if (combo[ch] !== undefined) { usedSubs[ch] = combo[ch]; hasSub = true; }
      }
      if (!hasSub) continue;
      const key = `${dm.i}-${dm.j}-${dm.dictionaryName}-${dm.matchedWord}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...dm, token: password.slice(dm.i, dm.j + 1), l33t: true, sub: usedSubs });
    }
  }
  return out;
}

function spatialMatch(password: string): Match[] {
  const out: Match[] = [];
  const n = password.length;
  for (const kb of KEYBOARDS) {
    let i = 0;
    while (i < n - 1) {
      let j = i + 1;
      let lastDir = -2;
      let turns = 0;
      let shiftedCount = kb.shifted.has(password[i]) ? 1 : 0;
      for (;;) {
        const prev = password[j - 1];
        const cur = password[j];
        const neighbors = kb.graph[prev];
        let found = false;
        if (neighbors) {
          for (let d = 0; d < neighbors.length; d++) {
            const nb = neighbors[d];
            if (nb && nb.indexOf(cur) !== -1) {
              found = true;
              if (nb.indexOf(cur) === 1) shiftedCount++; // shifted variant of the key
              if (d !== lastDir) { turns++; lastDir = d; }
              break;
            }
          }
        }
        if (!found) break;
        j++;
        if (j >= n) break;
      }
      const len = j - i;
      if (len >= 3) {
        out.push({ pattern: 'spatial', i, j: j - 1, token: password.slice(i, j), graph: kb.name, turns, shiftedCount });
        i = j;
      } else {
        i += 1;
      }
    }
  }
  return out;
}

function repeatMatch(password: string): Match[] {
  const out: Match[] = [];
  const n = password.length;
  const greedy = /(.+)\1+/g;
  const lazy = /(.+?)\1+/g;
  let lastIndex = 0;
  while (lastIndex < n) {
    greedy.lastIndex = lastIndex;
    lazy.lastIndex = lastIndex;
    const g = greedy.exec(password);
    if (!g) break;
    const l = lazy.exec(password);
    let m: RegExpExecArray;
    let baseToken: string;
    if (l && g[0].length > l[0].length) {
      m = g;
      const anchored = /^(.+?)\1+$/.exec(g[0]);
      baseToken = anchored ? anchored[1] : g[1];
    } else {
      m = l ?? g;
      baseToken = m[1];
    }
    const i = m.index;
    const j = i + m[0].length - 1;
    out.push({
      pattern: 'repeat', i, j, token: m[0],
      baseToken, baseGuesses: coreGuesses(baseToken).guesses, repeatCount: m[0].length / baseToken.length,
    });
    lastIndex = j + 1;
  }
  return out;
}

function sequenceMatch(password: string): Match[] {
  const out: Match[] = [];
  const n = password.length;
  if (n < 3) return [];
  let i = 0;
  while (i < n - 1) {
    const delta = password.charCodeAt(i + 1) - password.charCodeAt(i);
    let j = i + 1;
    while (j + 1 < n && password.charCodeAt(j + 1) - password.charCodeAt(j) === delta) j++;
    const len = j - i + 1;
    if (len >= 3 && Math.abs(delta) >= 1 && Math.abs(delta) <= 5) {
      const token = password.slice(i, j + 1);
      let name = 'unicode';
      if (/^[0-9]+$/.test(token)) name = 'digits';
      else if (/^[a-z]+$/.test(token)) name = 'lower';
      else if (/^[A-Z]+$/.test(token)) name = 'upper';
      out.push({ pattern: 'sequence', i, j, token, ascending: delta > 0, sequenceName: name });
      i = j;
    } else {
      i += 1;
    }
  }
  return out;
}

function regexMatch(password: string): Match[] {
  const out: Match[] = [];
  const re = /(19|20)\d\d/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(password))) {
    out.push({ pattern: 'regex', regexName: 'recent_year', i: m.index, j: m.index + m[0].length - 1, token: m[0] });
  }
  return out;
}

function dateMatch(password: string): Match[] {
  const out: Match[] = [];
  const sepRe = /(\d{1,2})([/\-_. ])(\d{1,2})\2(\d{2,4})/g;
  let m: RegExpExecArray | null;
  while ((m = sepRe.exec(password))) {
    const a = +m[1], b = +m[3];
    let y = +m[4];
    if (y < 100) y = y > 50 ? 1900 + y : 2000 + y;
    if (y >= 1900 && y <= 2050 && a >= 1 && a <= 31 && b >= 1 && b <= 31) {
      out.push({ pattern: 'date', i: m.index, j: m.index + m[0].length - 1, token: m[0], year: y, separator: m[2] });
    }
  }
  const plainRe = /\d{4,8}/g;
  while ((m = plainRe.exec(password))) {
    const t = m[0];
    let year = 0;
    const tail = +t.slice(-4), head = +t.slice(0, 4);
    if (tail >= 1900 && tail <= 2050) year = tail;
    else if (head >= 1900 && head <= 2050) year = head;
    if (year) out.push({ pattern: 'date', i: m.index, j: m.index + t.length - 1, token: t, year, separator: '' });
  }
  return out;
}

function omnimatch(password: string): Match[] {
  return [
    ...dictionaryMatch(password),
    ...reverseDictionaryMatch(password),
    ...l33tMatch(password),
    ...spatialMatch(password),
    ...repeatMatch(password),
    ...sequenceMatch(password),
    ...regexMatch(password),
    ...dateMatch(password),
  ];
}

// =====================================================================
//  Per-pattern guess estimators
// =====================================================================

function uppercaseVariations(token: string): number {
  const letters = token.replace(/[^a-zA-Z]/g, '');
  if (!letters || /^[^A-Z]+$/.test(letters)) return 1;
  if (/^[A-Z][^A-Z]+$/.test(letters) || /^[^A-Z]+[A-Z]$/.test(letters) || /^[A-Z]+$/.test(letters)) return 2;
  const U = (letters.match(/[A-Z]/g) || []).length;
  const L = (letters.match(/[a-z]/g) || []).length;
  let v = 0;
  for (let i = 1; i <= Math.min(U, L); i++) v += nCk(U + L, i);
  return v || 1;
}

function l33tVariations(match: Match): number {
  if (!match.l33t || !match.sub) return 1;
  let variations = 1;
  const token = match.token.toLowerCase();
  const word = (match.matchedWord || '').toLowerCase();
  for (const [cipher, letter] of Object.entries(match.sub)) {
    const S = token.split('').filter((c) => c === cipher).length; // substituted occurrences
    const total = word.split('').filter((c) => c === letter).length;
    const U = Math.max(total - S, 0); // un-substituted occurrences of the real letter
    if (U === 0) variations *= 2;
    else {
      let v = 0;
      for (let i = 1; i <= Math.min(S, U); i++) v += nCk(S + U, i);
      variations *= v || 1;
    }
  }
  return variations;
}

function dictionaryGuesses(match: Match): number {
  const base = match.rank || 1;
  const reversed = match.reversed ? 2 : 1;
  return base * uppercaseVariations(match.token) * l33tVariations(match) * reversed;
}

function spatialGuesses(match: Match): number {
  const kb = KEYBOARDS.find((k) => k.name === match.graph) || KEYBOARDS[0];
  const S = kb.starts;
  const D = kb.avgDegree;
  const L = match.token.length;
  const turns = match.turns || 1;
  let guesses = 0;
  for (let i = 2; i <= L; i++) {
    const possibleTurns = Math.min(turns, i - 1);
    for (let k = 1; k <= possibleTurns; k++) guesses += nCk(i - 1, k - 1) * S * Math.pow(D, k);
  }
  const shifted = match.shiftedCount || 0;
  if (shifted > 0) {
    const unshifted = L - shifted;
    if (unshifted === 0) guesses *= 2;
    else {
      let v = 0;
      for (let i = 1; i <= Math.min(shifted, unshifted); i++) v += nCk(shifted + unshifted, i);
      guesses *= v;
    }
  }
  return guesses;
}

function repeatGuesses(match: Match): number {
  return (match.baseGuesses || 1) * (match.repeatCount || 1);
}

function sequenceGuesses(match: Match): number {
  const first = match.token[0];
  let base: number;
  if (['a', 'A', 'z', 'Z', '0', '1', '9'].includes(first)) base = 4;
  else if (/[0-9]/.test(first)) base = 10;
  else base = 26;
  let guesses = base * match.token.length;
  if (!match.ascending) guesses *= 2;
  return guesses;
}

function regexGuesses(match: Match): number {
  if (match.regexName === 'recent_year') {
    const yearSpace = Math.max(Math.abs(parseInt(match.token, 10) - REFERENCE_YEAR), MIN_YEAR_SPACE);
    return yearSpace;
  }
  return Math.pow(10, match.token.length);
}

function dateGuesses(match: Match): number {
  const yearSpace = Math.max(Math.abs((match.year || REFERENCE_YEAR) - REFERENCE_YEAR), MIN_YEAR_SPACE);
  let guesses = yearSpace * 365;
  if (match.separator) guesses *= 4;
  return guesses;
}

function bruteforceGuesses(match: Match, cardinality: number): number {
  let guesses = Math.pow(cardinality, match.token.length);
  if (!isFinite(guesses)) guesses = Number.MAX_VALUE;
  const min = match.token.length === 1 ? MIN_SUBMATCH_GUESSES_SINGLE_CHAR + 1 : MIN_SUBMATCH_GUESSES_MULTI_CHAR + 1;
  return Math.max(guesses, min);
}

function estimateGuesses(match: Match, password: string, cardinality: number): number {
  if (match.guesses != null) return match.guesses;
  let minGuesses = 1;
  if (match.token.length < password.length) {
    minGuesses = match.token.length === 1 ? MIN_SUBMATCH_GUESSES_SINGLE_CHAR : MIN_SUBMATCH_GUESSES_MULTI_CHAR;
  }
  let g: number;
  switch (match.pattern) {
    case 'dictionary': g = dictionaryGuesses(match); break;
    case 'spatial': g = spatialGuesses(match); break;
    case 'repeat': g = repeatGuesses(match); break;
    case 'sequence': g = sequenceGuesses(match); break;
    case 'regex': g = regexGuesses(match); break;
    case 'date': g = dateGuesses(match); break;
    default: g = bruteforceGuesses(match, cardinality); break;
  }
  match.guesses = Math.max(g, minGuesses);
  return match.guesses;
}

// =====================================================================
//  Minimum-guess search (dynamic programming over the optimal sequence)
// =====================================================================

function mostGuessable(password: string, matches: Match[], cardinality: number): { guesses: number; sequence: Match[] } {
  const n = password.length;
  if (n === 0) return { guesses: 1, sequence: [] };

  const byEnd: Match[][] = Array.from({ length: n }, () => []);
  for (const m of matches) if (m.j >= 0 && m.j < n) byEnd[m.j].push(m);
  for (const arr of byEnd) arr.sort((a, b) => a.i - b.i);

  const optimal = {
    m: Array.from({ length: n }, () => ({}) as Record<number, Match>),
    pi: Array.from({ length: n }, () => ({}) as Record<number, number>),
    g: Array.from({ length: n }, () => ({}) as Record<number, number>),
  };

  const update = (m: Match, l: number) => {
    const k = m.j;
    let pi = estimateGuesses(m, password, cardinality);
    if (l > 1) pi *= optimal.pi[m.i - 1][l - 1];
    let g = factorial(l) * pi;
    if (!isFinite(g)) g = Number.MAX_VALUE;
    g += Math.pow(MIN_GUESSES_BEFORE_GROWING_SEQUENCE, l - 1);
    for (const [compL, compG] of Object.entries(optimal.g[k])) {
      if (+compL > l) continue;
      if (compG <= g) return;
    }
    optimal.g[k][l] = g;
    optimal.m[k][l] = m;
    optimal.pi[k][l] = pi;
  };

  const bruteforceUpdate = (k: number) => {
    update({ pattern: 'bruteforce', i: 0, j: k, token: password.slice(0, k + 1) }, 1);
    for (let i = 1; i <= k; i++) {
      const m: Match = { pattern: 'bruteforce', i, j: k, token: password.slice(i, k + 1) };
      for (const [l, lastM] of Object.entries(optimal.m[i - 1])) {
        if (lastM.pattern === 'bruteforce') continue;
        update(m, +l + 1);
      }
    }
  };

  for (let k = 0; k < n; k++) {
    for (const m of byEnd[k]) {
      if (m.i > 0) {
        for (const l of Object.keys(optimal.m[m.i - 1])) update(m, +l + 1);
      } else {
        update(m, 1);
      }
    }
    bruteforceUpdate(k);
  }

  // unwind
  let bestL = 1;
  let bestG = Infinity;
  for (const [l, g] of Object.entries(optimal.g[n - 1])) {
    if (g < bestG) { bestG = g; bestL = +l; }
  }
  const sequence: Match[] = [];
  let k = n - 1;
  let l = bestL;
  while (k >= 0 && l >= 1) {
    const m = optimal.m[k][l];
    if (!m) break;
    sequence.unshift(m);
    k = m.i - 1;
    l -= 1;
  }
  const guesses = optimal.g[n - 1][bestL] ?? Math.pow(cardinality, n);
  return { guesses, sequence };
}

function coreGuesses(password: string): { guesses: number; sequence: Match[] } {
  if (!password) return { guesses: 1, sequence: [] };
  return mostGuessable(password, omnimatch(password), calcCardinality(password));
}

// =====================================================================
//  Scoring → bits, scenarios, feedback
// =====================================================================

function guessesToScore(guesses: number): number {
  const DELTA = 5;
  if (guesses < 1e3 + DELTA) return 0;
  if (guesses < 1e6 + DELTA) return 1;
  if (guesses < 1e8 + DELTA) return 2;
  if (guesses < 1e10 + DELTA) return 3;
  return 4;
}

function matchDetail(m: Match): string {
  switch (m.pattern) {
    case 'dictionary': {
      const where = m.dictionaryName === 'passwords' ? 'common password'
        : m.dictionaryName === 'names' || m.dictionaryName === 'surnames' ? 'name'
        : 'word';
      const tags = [m.reversed ? 'reversed' : '', m.l33t ? 'l33t' : ''].filter(Boolean).join(', ');
      return `${where} “${m.matchedWord}” (#${m.rank})${tags ? ` · ${tags}` : ''}`;
    }
    case 'spatial':
      return `keyboard walk (${m.graph}, ${m.turns} turn${m.turns === 1 ? '' : 's'})`;
    case 'repeat':
      return `“${m.baseToken}” repeated ×${m.repeatCount}`;
    case 'sequence':
      return `${m.ascending ? 'ascending' : 'descending'} sequence`;
    case 'regex':
      return 'recent year';
    case 'date':
      return `date (${m.year})`;
    default:
      return 'brute force';
  }
}

function toPublic(m: Match, password: string, cardinality: number): PublicMatch {
  const guesses = estimateGuesses(m, password, cardinality);
  return { pattern: m.pattern, token: m.token, guesses, bits: log2(guesses), detail: matchDetail(m) };
}

function getFeedback(password: string, sequence: Match[], bits: number): { warning: string; suggestions: string[] } {
  if (sequence.length === 0) return { warning: '', suggestions: [] };
  // Gate on offline-calibrated bits so advice matches the displayed rating:
  // "good" or better (≥ 56 bits) gets no nagging; weaker passwords get warned.
  if (bits >= 56) {
    const s: string[] = [];
    if (bits < 72 && password.length < 16) s.push('Solid — adding length or words pushes it higher still.');
    return { warning: '', suggestions: s };
  }

  // Warn about the weakest (cheapest) explained chunk.
  const longest = sequence.reduce((a, b) => (b.token.length > a.token.length ? b : a), sequence[0]);
  const suggestions: string[] = [];
  let warning = '';

  switch (longest.pattern) {
    case 'dictionary':
      if (longest.dictionaryName === 'passwords') warning = longest.rank! <= 20 ? 'This is a top-20 most common password.' : 'This is a frequently used password.';
      else if (longest.dictionaryName === 'names' || longest.dictionaryName === 'surnames') warning = 'Names and surnames are easy to guess.';
      else warning = 'A single word is easy to guess — a phrase of several words is far stronger.';
      if (longest.l33t) suggestions.push('Predictable substitutions like @ for a barely help.');
      if (uppercaseVariations(longest.token) <= 2 && /[A-Z]/.test(longest.token)) suggestions.push('Capitalize more than the first letter.');
      break;
    case 'spatial':
      warning = (longest.turns || 1) <= 2 ? 'Short keyboard patterns like “qwerty” are easy to guess.' : 'Keyboard patterns are easier to guess than they look.';
      suggestions.push('Use a longer keyboard path with more turns, or avoid them entirely.');
      break;
    case 'repeat':
      warning = 'Repeated characters or chunks (“aaa”, “abcabc”) are easy to guess.';
      suggestions.push('Avoid repeated characters and repeated words.');
      break;
    case 'sequence':
      warning = 'Sequences like “abc” or “6543” are easy to guess.';
      suggestions.push('Avoid predictable sequences.');
      break;
    case 'regex':
    case 'date':
      warning = 'Dates and recent years are easy to guess.';
      suggestions.push('Avoid years, birthdays and other dates.');
      break;
  }

  if (password.length < 12) suggestions.push('Make it longer — length matters more than complexity.');
  if (sequence.length <= 2) suggestions.push('Add more unrelated words or characters.');
  return { warning, suggestions };
}

export function estimateStrength(password: string): Strength {
  if (!password) {
    return {
      password: '', guesses: 0, bits: 0, score: 0, cardinality: 0,
      sequence: [], scenarios: crackScenarios(0), feedback: { warning: '', suggestions: [] },
    };
  }
  const cardinality = calcCardinality(password);
  const { guesses, sequence } = mostGuessable(password, omnimatch(password), cardinality);
  const bits = log2(guesses);
  return {
    password,
    guesses,
    bits,
    score: guessesToScore(guesses),
    cardinality,
    sequence: sequence.map((m) => toPublic(m, password, cardinality)),
    scenarios: crackScenarios(guesses),
    feedback: getFeedback(password, sequence, bits),
  };
}
