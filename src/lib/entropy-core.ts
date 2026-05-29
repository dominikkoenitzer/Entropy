/* ============================================================
   entropy-core.ts — shared password engine
   Faithful TypeScript port of the handoff's entropy-core.js.
   Pure logic, no DOM. Do not re-derive the math.
   ============================================================ */

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

// --- compact, friendly wordlist (~280 short, clean words) -------------
export const WORDS: readonly string[] = (
  'able acid acorn actor adobe agile alarm album alert alley amber amble anchor angle ' +
  'apple april arbor arena armor arrow aspen atlas attic audio aura autumn axiom bacon badge bagel ' +
  'baker balsa bamboo banjo barge basil baton bayou beach beacon beam bean bear beaver beetle bench ' +
  'berry birch bison blaze bloom blossom board bolt bonus boost booth boulder brace brave bread breeze ' +
  'brick bridge brisk bronze brook broom brush bubble buckle buffalo bugle bulb bunny burst butter ' +
  'cabin cable cactus camel candle canoe canyon cargo carol carpet carrot castle cedar cello cement ' +
  'cereal chalk charm cheese cherry chess chime chip cider cinema circus citrus clamp clay clever cliff ' +
  'cloak clock cloud clover cobalt cocoa comet compass copper coral cosmic cotton cougar cove cozy crane ' +
  'crater crayon cream creek crescent crew crisp crystal cube curl cyan dahlia daisy dapper dash dawn ' +
  'deck delta denim depot desert desk diamond diner dock dome donut dragon dream drift drum dune dusk ' +
  'eagle ember emerald engine ether fable falcon fancy fern ferry fiber fig finch flame flask flint ' +
  'float fjord forest forge fox fresh frost galaxy garden gecko ginger glade glass glove glow gold ' +
  'granite grape grove guava hammer harbor hazel heron hickory honey hum ivory jade jasmine jelly jewel ' +
  'jolly jungle kayak kettle koala lagoon lake lantern lemon lentil lilac lily linen lion lotus lunar ' +
  'lyric mango maple marble meadow melon mint mocha moss motto mural mushroom nectar noble nomad north ' +
  'nova oasis ocean olive onyx opal orbit orchid otter oxen pansy papaya parsley peach pearl pebble ' +
  'pecan pepper petal pewter piano pigeon pine pixel planet plaza plum poem pony poppy prairie prism ' +
  'puddle pumpkin quartz quiet quill quilt rabbit radar raven reef relay ribbon ridge river robin rocket ' +
  'rose ruby saffron sage salmon sand sapphire satin scarf sequoia shadow shell sierra silk silver sky ' +
  'slate sloth snow solar sonic spark sphinx spice spruce squid stable starling stone stork storm summit ' +
  'sunset swan syrup table talon tango teak temple thistle thunder tiger timber toast token topaz totem ' +
  'trail tulip tundra turtle umber valley vapor velvet vine violet vivid walnut wander wave whale wheat ' +
  'willow window winter wolf wonder wren yarn yonder zebra zenith zephyr zinc'
)
  .split(/\s+/)
  .filter(Boolean);

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

// bits for a passphrase: words drawn from list + extras
export function bitsWords(count: number, listSize: number, extras: { number?: boolean }): number {
  let b = count * Math.log2(listSize);
  if (extras.number) b += Math.log2(10); // a digit appended somewhere
  return Math.round(b);
}

// 0..4 tier from bits
export function tier(bits: number): number {
  if (bits < 40) return 0; // weak
  if (bits < 60) return 1; // fair
  if (bits < 80) return 2; // good
  if (bits < 110) return 3; // strong
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
// assume 1e11 guesses/sec (offline, fast attacker), avg = half keyspace
export function crackTime(bits: number): string {
  const guessesPerSec = 1e11;
  const seconds = Math.pow(2, bits) / 2 / guessesPerSec;
  return humanizeSeconds(seconds);
}

function humanizeSeconds(s: number): string {
  if (s < 1e-3) return 'instantly';
  if (s < 1) return 'less than a second';
  const units: Array<[string, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 365],
    ['year', 1000],
    ['millennium', 1e3],
  ];
  let val = s;
  let name = 'second';
  for (let i = 0; i < units.length; i++) {
    const [n, factor] = units[i];
    name = n;
    if (val < factor || i === units.length - 1) break;
    val /= factor;
  }
  if (name === 'millennium' && val >= 1e6) {
    return 'longer than the universe has existed';
  }
  const rounded = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10;
  const plural = rounded === 1 ? '' : 's';
  const pretty = rounded >= 1000 ? rounded.toLocaleString() : rounded;
  return `${pretty} ${name}${plural}`;
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

// --- analyze an arbitrary password ------------------------------------
const COMMON = [
  'password', '123456', 'qwerty', 'letmein', 'admin',
  'welcome', 'iloveyou', 'monkey', 'dragon', 'abc123',
];

export function analyze(pw: string): Analysis {
  if (!pw) {
    return {
      value: '', bits: 0, length: 0, pool: 0, classes: [],
      crack: '—', tier: 0, tierInfo: TIERS[0], notes: [],
    };
  }
  const classes: CharClass[] = [];
  let pool = 0;
  if (/[a-z]/.test(pw)) { classes.push('lower'); pool += 26; }
  if (/[A-Z]/.test(pw)) { classes.push('upper'); pool += 26; }
  if (/[0-9]/.test(pw)) { classes.push('number'); pool += 10; }
  if (/[^a-zA-Z0-9]/.test(pw)) { classes.push('symbol'); pool += 30; }

  let bits = bitsRandom(pw.length, pool || 1);

  // penalties for obvious weakness
  const notes: string[] = [];
  const lower = pw.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) {
    bits = Math.min(bits, 8);
    notes.push('contains a common password');
  }
  if (/^(.)\1+$/.test(pw)) {
    bits = Math.min(bits, 6);
    notes.push('just one repeated character');
  }
  if (/0123|1234|2345|3456|4567|5678|6789|abcd|qwer/.test(lower)) {
    bits = Math.round(bits * 0.6);
    notes.push('contains a predictable sequence');
  }
  if (pw.length < 8) notes.push('shorter than 8 characters');
  if (classes.length === 1) notes.push('only one character type');
  if (notes.length === 0) notes.push('no obvious weaknesses');

  return {
    value: pw,
    length: pw.length,
    pool,
    classes,
    bits,
    crack: crackTime(bits),
    tier: tier(bits),
    tierInfo: tierInfo(bits),
    notes,
  };
}

// classify a single character (for color coding)
export function classOf(ch: string): CharClass {
  if (/[a-z]/.test(ch)) return 'lower';
  if (/[A-Z]/.test(ch)) return 'upper';
  if (/[0-9]/.test(ch)) return 'number';
  return 'symbol';
}
