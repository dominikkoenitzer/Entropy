/* ============================================================
   entropy-core.ts — shared password engine
   Pure logic, no DOM.

   Generation (crypto-strong random / passphrases) and the entropy math for
   *generated* secrets live here. Strength ANALYSIS of arbitrary passwords is
   delegated to ./strength — a guess-estimation engine that models real attack
   strategies (dictionaries, l33t, keyboard walks, sequences, dates, brute
   force) rather than naive charset entropy. (The original "do not re-derive
   the math" port was deliberately replaced with this stronger model.)
   ============================================================ */

import { humanizeSeconds, type Scenario } from './format';
import type { PublicMatch } from './strength';
import { PASSPHRASE_WORDS } from './wordlist.generated';

export type CharClass = 'lower' | 'upper' | 'number' | 'symbol';

export interface RandomOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
  avoidAmbiguous: boolean;
}

export interface WordOptions {
  count: number;
  separator: string;
  capitalize: boolean;
  number: boolean;
}

export interface GenResult {
  value: string;
  bits: number;
  mode: 'random' | 'words';
}

export interface TierInfo {
  key: string;
  label: string;
  hint: string;
}

export interface Analysis {
  value: string;
  length: number;
  pool: number;
  classes: CharClass[];
  bits: number;
  crack: string;
  tier: number;
  tierInfo: TierInfo;
  notes: string[];
  // --- advanced fields from the guess-estimation engine ---
  guesses: number;            // estimated guesses for the cheapest attack
  scenarios: Scenario[];      // crack time across attack models (online → GPU farm)
  sequence: PublicMatch[];    // how the password decomposes (the attack path)
  warning: string;            // headline weakness, if any
  suggestions: string[];      // actionable advice
}

// --- character sets ---------------------------------------------------
export const SETS: Record<CharClass, string> = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  number: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{};:,.<>?/~',
};

// characters that look alike — removed when "avoid ambiguous" is on
export const AMBIGUOUS = new Set('O0oIl1|`\'".,:;{}[]()/\\~'.split(''));

// --- crypto-strong random ---------------------------------------------
function randInt(max: number): number {
  // unbiased rejection sampling over crypto bytes
  if (max <= 0) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function pick(str: string): string {
  return str[randInt(str.length)];
}

// --- passphrase wordlist ----------------------------------------------
// EFF "large" diceware list (7776 words → ~12.9 bits each), downloaded at
// build time and bundled (see scripts/build-dict.mjs). Refresh with: pnpm dict.
export const WORDS: readonly string[] = PASSPHRASE_WORDS;

// --- entropy math -----------------------------------------------------
export function poolSize(opts: Partial<RandomOptions>): number {
  let n = 0;
  if (opts.lower) n += SETS.lower.length;
  if (opts.upper) n += SETS.upper.length;
  if (opts.number) n += SETS.number.length;
  if (opts.symbol) n += SETS.symbol.length;
  return n;
}

// bits for a random-char password of given length & pool
export function bitsRandom(length: number, pool: number): number {
  if (pool <= 1 || length <= 0) return 0;
  return Math.round(length * Math.log2(pool));
}

// bits for a passphrase: words drawn from list + extras.
// Honest accounting of the keyspace we actually sample from: each word adds
// log2(listSize); an appended number adds log2(value space) + log2(which word).
// Deterministic capitalize-first adds 0 bits (it's not random), so it's omitted.
export function bitsWords(count: number, listSize: number, extras: { number?: boolean }): number {
  let b = count * Math.log2(listSize);
  if (extras.number) b += Math.log2(90) + Math.log2(Math.max(count, 1)); // value 10..99, random word
  return Math.round(b);
}

// 0..4 tier from bits. Thresholds are calibrated to a serious OFFLINE attacker
// (fast-hash GPU, ~10^10 guesses/sec) so the label never contradicts the crack
// time — e.g. a password that falls in seconds offline is never called "strong".
//   < 40 bits  ~ cracked in minutes or less offline
//   40–55      ~ hours to a few years
//   56–71      ~ years to millennia
//   72–95      ~ far beyond a lifetime
//   ≥ 96       ~ astronomically infeasible
export function tier(bits: number): number {
  if (bits < 40) return 0; // weak
  if (bits < 56) return 1; // fair
  if (bits < 72) return 2; // good
  if (bits < 96) return 3; // strong
  return 4; // maximum
}

export const TIERS: TierInfo[] = [
  { key: 'weak', label: 'weak', hint: 'trivial to crack' },
  { key: 'fair', label: 'fair', hint: 'ok for low stakes' },
  { key: 'good', label: 'good', hint: 'solid for most uses' },
  { key: 'strong', label: 'strong', hint: 'great for anything' },
  { key: 'maximum', label: 'maximum', hint: 'overkill — in a good way' },
];

export function tierInfo(bits: number): TierInfo {
  return TIERS[tier(bits)];
}

// --- crack time -------------------------------------------------------
// Headline crack time for a GENERATED secret of known entropy: the offline
// fast-hash attacker (~10^10 guesses/sec on a GPU). Matches the 'offline_fast'
// scenario the analyzer reports, so both tabs speak the same language.
export const OFFLINE_FAST_RATE = 1e10;
export function crackTime(bits: number): string {
  return humanizeSeconds(Math.pow(2, bits) / OFFLINE_FAST_RATE);
}

// --- generators -------------------------------------------------------
export function generateRandom(opts: RandomOptions): GenResult {
  const active: CharClass[] = [];
  if (opts.lower) active.push('lower');
  if (opts.upper) active.push('upper');
  if (opts.number) active.push('number');
  if (opts.symbol) active.push('symbol');
  if (active.length === 0) active.push('lower');

  const filtered: Partial<Record<CharClass, string>> = {};
  let allPool = '';
  active.forEach((k) => {
    let s = SETS[k];
    if (opts.avoidAmbiguous) s = s.split('').filter((c) => !AMBIGUOUS.has(c)).join('');
    filtered[k] = s;
    allPool += s;
  });

  const len = Math.max(active.length, opts.length);
  const chars: string[] = [];
  // guarantee at least one of each active set
  active.forEach((k) => chars.push(pick(filtered[k] as string)));
  for (let i = chars.length; i < len; i++) chars.push(pick(allPool));
  // shuffle (Fisher–Yates with crypto)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const pw = chars.join('');
  const bits = bitsRandom(len, allPool.length);
  return { value: pw, bits, mode: 'random' };
}

export function generateWords(opts: WordOptions): GenResult {
  const sep = opts.separator == null ? '-' : opts.separator;
  const words: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    let w = WORDS[randInt(WORDS.length)];
    if (opts.capitalize) w = w[0].toUpperCase() + w.slice(1);
    words.push(w);
  }
  if (opts.number) {
    // append a digit (10..99) to a random word
    const d = randInt(90) + 10;
    const idx = randInt(words.length);
    words[idx] = words[idx] + d;
  }
  const pw = words.join(sep);
  const bits = bitsWords(opts.count, WORDS.length, { number: !!opts.number });
  return { value: pw, bits, mode: 'words' };
}

// analyze() lives in ./analyze (dynamically imported) so the heavy guess-
// estimation dictionaries are code-split out of the generate path.

// classify a single character (for color coding)
export function classOf(ch: string): CharClass {
  if (/[a-z]/.test(ch)) return 'lower';
  if (/[A-Z]/.test(ch)) return 'upper';
  if (/[0-9]/.test(ch)) return 'number';
  return 'symbol';
}
