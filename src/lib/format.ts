/* ============================================================
   format.ts — crack-time formatting & attack scenarios.
   Deliberately dependency-free (no dictionaries) so it can live in the light
   "generate" path as well as the heavy, code-split analyzer.
   ============================================================ */

export interface Scenario {
  key: string;
  label: string;
  sub: string;
  seconds: number;
  time: string;
}

export function humanizeSeconds(seconds: number): string {
  if (seconds < 1e-3) return 'instantly';
  if (seconds < 1) return 'less than a second';
  const UNIVERSE = 4.35e17; // ~13.8 billion years
  if (seconds > UNIVERSE) return 'longer than the universe has existed';
  const units: Array<[number, string]> = [
    [1, 'second'], [60, 'minute'], [3600, 'hour'], [86400, 'day'],
    [2629743, 'month'], [31556952, 'year'], [3155695200, 'century'],
  ];
  let chosen = units[0];
  for (const u of units) { if (seconds >= u[0]) chosen = u; else break; }
  const val = seconds / chosen[0];
  const rounded = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10;
  const num = rounded >= 1000 ? rounded.toLocaleString('en-US', { maximumFractionDigits: 0 }) : rounded;
  const plural = rounded === 1 ? '' : 's';
  const name = chosen[1] === 'century' && rounded !== 1 ? 'centurie' : chosen[1];
  return `${num} ${name}${plural}`;
}

const SCENARIOS: Array<{ key: string; label: string; sub: string; rate: number }> = [
  { key: 'online_throttled', label: 'Online, rate-limited', sub: '100 / hr', rate: 100 / 3600 },
  { key: 'online', label: 'Online, no limit', sub: '10 / sec', rate: 10 },
  { key: 'offline_slow', label: 'Offline, slow hash', sub: 'bcrypt · 10⁴/s', rate: 1e4 },
  { key: 'offline_fast', label: 'Offline, fast hash', sub: 'GPU · 10¹⁰/s', rate: 1e10 },
  { key: 'offline_extreme', label: 'Offline, GPU farm', sub: '10¹²/s', rate: 1e12 },
];

export function crackScenarios(guesses: number): Scenario[] {
  return SCENARIOS.map((s) => {
    const seconds = guesses / s.rate;
    return { key: s.key, label: s.label, sub: s.sub, seconds, time: humanizeSeconds(seconds) };
  });
}
