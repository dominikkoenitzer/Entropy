/**
 * Strength analysis of an arbitrary password.
 *
 * This sits apart from entropy-core, and the Analyze UI imports it
 * dynamically, so the ~90 KB of guess-estimation dictionaries are code-split.
 * They load only when someone opens the analyzer, never on first paint and
 * never for the generator. They are still bundled and served from our own
 * origin, so there is no third-party or data network call, which is what
 * local-only requires.
 */

import { estimateStrength } from './strength';
import { tier, tierInfo, TIERS, crackTime, type Analysis, type CharClass } from './entropy-core';

// Composition (which classes appear) is reported for display; the strength
// itself comes from the guess-estimation engine, which considers the many ways
// a password can actually be cracked, not just its charset size.
export function analyze(pw: string): Analysis {
  const empty: Analysis = {
    value: '', bits: 0, length: 0, pool: 0, classes: [],
    crack: '···', tier: 0, tierInfo: TIERS[0], notes: [],
    guesses: 0, scenarios: [], sequence: [], warning: '', suggestions: [],
  };
  if (!pw) return empty;

  const classes: CharClass[] = [];
  if (/[a-z]/.test(pw)) classes.push('lower');
  if (/[A-Z]/.test(pw)) classes.push('upper');
  if (/[0-9]/.test(pw)) classes.push('number');
  if (/[^a-zA-Z0-9]/.test(pw)) classes.push('symbol');

  const s = estimateStrength(pw);
  const bits = Math.round(s.bits);
  const offline = s.scenarios.find((x) => x.key === 'offline_fast');
  const notes = [s.feedback.warning, ...s.feedback.suggestions].filter(Boolean);

  return {
    value: pw,
    length: pw.length,
    pool: s.cardinality,
    classes,
    bits,
    crack: offline ? offline.time : crackTime(bits),
    // Tier from guess-based bits (offline-attacker calibrated) so the label
    // agrees with the crack times shown, not zxcvbn's online-lenient score.
    tier: tier(bits),
    tierInfo: tierInfo(bits),
    notes: notes.length ? notes : ['no obvious weaknesses'],
    guesses: s.guesses,
    scenarios: s.scenarios,
    sequence: s.sequence,
    warning: s.feedback.warning,
    suggestions: s.feedback.suggestions,
  };
}
