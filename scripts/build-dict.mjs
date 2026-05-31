/* ============================================================
   build-dict.mjs — regenerates the bundled wordlist modules.

   Downloads reputable, license-clean lists, normalises and rank-truncates
   them, and writes committed TypeScript modules the app bundles. Keeps the
   analyzer's dictionaries and the passphrase wordlist large & accurate WITHOUT
   hand-typing them and WITHOUT any runtime network call. Run on demand:
       pnpm dict

   Outputs:
     src/lib/strength-dict.generated.ts  — analyzer dictionaries (code-split)
     src/lib/wordlist.generated.ts        — EFF passphrase wordlist (generator)

   Sources & licenses:
     passwords  SecLists top-N common credentials (MIT)
     english    hermitdave FrequencyWords en_50k, frequency-ordered (MIT)
     names      SecLists USA name lists (MIT)
     passphrase EFF "large" diceware wordlist (CC-BY 3.0 US, © EFF)
   ============================================================ */
import { writeFileSync } from 'node:fs';

// english past ~12k is rare words that almost never appear in passwords; the
// password list does the heavy lifting for weak-password detection.
const CAPS = { passwords: 20000, english: 12000, names: 2000, surnames: 1000 };

const SOURCES = {
  passwords: [
    'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10-million-password-list-top-100000.txt',
    'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt',
  ],
  english: [
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
    'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt',
  ],
  male: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/Names/malenames-usa-top1000.txt',
  female: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/Names/femalenames-usa-top1000.txt',
  surnames: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/Names/familynames-usa-top1000.txt',
  passphrase: [
    'https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt',
    'https://raw.githubusercontent.com/ulif/diceware/master/diceware/wordlists/wordlist_en_eff.txt',
  ],
};

// Emergency fallbacks so a failed download never yields an empty list.
const FALLBACK = {
  passwords: 'password 123456 12345678 qwerty abc123 letmein admin iloveyou monkey dragon'.split(' '),
  english: 'the be to of and password dragon shadow master sunshine football welcome'.split(' '),
  names: 'james john robert mary patricia jennifer michael william david linda'.split(' '),
  surnames: 'smith johnson williams brown jones garcia miller davis wilson'.split(' '),
  passphrase: ('able acid acorn actor adobe agile alarm album alert alley amber anchor angle apple ' +
    'arbor arena armor arrow aspen atlas attic audio aura autumn axiom bacon badge bagel baker ' +
    'banjo barge basil baton beach beacon beam bean bear beaver beetle bench berry birch bison ' +
    'blaze bloom board bolt bonus boost booth brace brave bread breeze brick bridge brisk bronze ' +
    'brook broom brush bubble buckle buffalo bugle bulb bunny burst butter cabin cable cactus camel ' +
    'candle canoe canyon cargo carol carpet carrot castle cedar cello cement cereal chalk charm ' +
    'cheese cherry chess chime cider cinema circus citrus clay clever cliff cloak clock cloud clover ' +
    'cobalt cocoa comet compass copper coral cosmic cotton cougar cove crane crater crayon cream creek ' +
    'crew crisp crystal cube curl cyan dahlia daisy dapper dash dawn deck delta denim depot desert desk ' +
    'diamond diner dock dome donut dragon dream drift drum dune dusk eagle ember emerald engine ether ' +
    'fable falcon fancy fern ferry fiber fig finch flame flask flint float forest forge fox fresh frost ' +
    'galaxy garden gecko ginger glade glass glove glow gold granite grape grove guava hammer harbor hazel ' +
    'heron honey ivory jade jasmine jelly jewel jolly jungle kayak kettle koala lagoon lake lantern lemon ' +
    'lentil lilac lily linen lion lotus lunar lyric mango maple marble meadow melon mint mocha moss motto ' +
    'mural nectar noble nomad north nova oasis ocean olive onyx opal orbit orchid otter oxen pansy papaya ' +
    'parsley peach pearl pebble pecan pepper petal pewter piano pigeon pine pixel planet plaza plum poem ' +
    'pony poppy prairie prism puddle pumpkin quartz quiet quill quilt rabbit radar raven reef relay ribbon ' +
    'ridge river robin rocket rose ruby saffron sage salmon sand satin scarf shadow shell sierra silk silver ' +
    'sky slate sloth snow solar sonic spark spice spruce squid stable stone stork storm summit sunset swan ' +
    'syrup table talon tango teak temple thistle thunder tiger timber toast token topaz totem trail tulip ' +
    'tundra turtle umber valley vapor velvet vine violet vivid walnut wander wave whale wheat willow window ' +
    'winter wolf wonder wren yarn yonder zebra zenith zephyr zinc').split(/\s+/),
};

async function fetchLines(urls) {
  let lastErr;
  for (const url of [].concat(urls)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'entropy-dict-builder' } });
      if (!res.ok) throw new Error(`${res.status}`);
      return { lines: (await res.text()).split(/\r?\n/), url };
    } catch (e) {
      lastErr = new Error(`${e.message} ${url}`);
    }
  }
  throw lastErr;
}

async function get(name, urls, { alphaOnly = false, pick = 'first' } = {}) {
  let r;
  try {
    r = await fetchLines(urls);
    console.log(`  ✓ ${name}: ${r.lines.length} lines from ${r.url.split('/').pop()}`);
  } catch (e) {
    console.warn(`  ✗ ${name}: ${e.message} — using fallback`);
    return null;
  }
  const seen = new Set();
  const out = [];
  for (const raw of r.lines) {
    const parts = raw.trim().split(/\s+/);
    const tok = (pick === 'last' ? parts[parts.length - 1] : parts[0] || '').toLowerCase();
    if (tok.length < 3) continue;
    if (alphaOnly && !/^[a-z]+$/.test(tok)) continue;
    if (seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
  }
  return out;
}

const lit = (arr) => `${JSON.stringify(arr.join('\n'))}.split('\\n')`;

async function main() {
  console.log('Fetching wordlists…');
  const [pw, en, male, female, sur, eff] = await Promise.all([
    get('passwords', SOURCES.passwords),
    get('english', SOURCES.english, { alphaOnly: true }),
    get('male names', SOURCES.male, { alphaOnly: true }),
    get('female names', SOURCES.female, { alphaOnly: true }),
    get('surnames', SOURCES.surnames, { alphaOnly: true }),
    get('passphrase', SOURCES.passphrase, { alphaOnly: true, pick: 'last' }),
  ]);

  const passwords = (pw ?? FALLBACK.passwords).slice(0, CAPS.passwords);
  const english = (en ?? FALLBACK.english).slice(0, CAPS.english);

  let names;
  if (male && female) {
    const merged = [];
    const seen = new Set();
    for (let i = 0; i < Math.max(male.length, female.length); i++) {
      for (const n of [male[i], female[i]]) if (n && !seen.has(n)) { seen.add(n); merged.push(n); }
    }
    names = merged;
  } else {
    names = FALLBACK.names;
  }
  names = names.slice(0, CAPS.names);
  const surnames = (sur ?? FALLBACK.surnames).slice(0, CAPS.surnames);
  // passphrase words: keep clean 3–9 letter words for a usable diceware feel
  const passphrase = (eff ?? FALLBACK.passphrase).filter((w) => w.length >= 3 && w.length <= 9);

  const dictBanner = `/* ============================================================
   strength-dict.generated.ts — GENERATED FILE, DO NOT EDIT BY HAND.
   Regenerate with:  pnpm dict   (see scripts/build-dict.mjs)
   Ranked analyzer dictionaries (rank = index + 1). Bundled, no runtime network.
   Sources: passwords SecLists (MIT) · english hermitdave FrequencyWords (MIT)
            names/surnames SecLists (MIT)
   ============================================================ */
/* eslint-disable */
`;
  writeFileSync(
    new URL('../src/lib/strength-dict.generated.ts', import.meta.url),
    dictBanner +
      `export const PASSWORDS: string[] = ${lit(passwords)};\n` +
      `export const ENGLISH: string[] = ${lit(english)};\n` +
      `export const FIRST_NAMES: string[] = ${lit(names)};\n` +
      `export const SURNAMES: string[] = ${lit(surnames)};\n`
  );

  const wordBanner = `/* ============================================================
   wordlist.generated.ts — GENERATED FILE, DO NOT EDIT BY HAND.
   Regenerate with:  pnpm dict   (see scripts/build-dict.mjs)
   Passphrase wordlist for the generator. Source: EFF "large" diceware wordlist
   (CC-BY 3.0 US, © Electronic Frontier Foundation). Bundled, no runtime network.
   ============================================================ */
/* eslint-disable */
`;
  writeFileSync(
    new URL('../src/lib/wordlist.generated.ts', import.meta.url),
    wordBanner + `export const PASSPHRASE_WORDS: string[] = ${lit(passphrase)};\n`
  );

  console.log(
    `\nWrote strength-dict.generated.ts — passwords ${passwords.length}, english ${english.length}, names ${names.length}, surnames ${surnames.length}`
  );
  console.log(`Wrote wordlist.generated.ts — passphrase ${passphrase.length} words`);
}

main().catch((e) => { console.error(e); process.exit(1); });
