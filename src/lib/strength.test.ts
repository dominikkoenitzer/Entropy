import { describe, it, expect } from 'vitest';
import { estimateStrength, type Pattern } from './strength';
import { analyze } from './analyze';
import {
  bitsRandom,
  poolSize,
  tier,
  classOf,
  generateRandom,
  generateWords,
  SETS,
  WORDS,
} from './entropy-core';

const patternsOf = (pw: string): Pattern[] =>
  estimateStrength(pw).sequence.map((m) => m.pattern);

const guessesOf = (pw: string): number => estimateStrength(pw).guesses;

/** A password with no dictionary/spatial/sequence structure to match. */
const RANDOM_16 = 'x7Qv#2mKp9Lz!4Rt';

describe('estimateStrength — pattern matchers', () => {
  it('matches a common dictionary word', () => {
    expect(patternsOf('password')).toContain('dictionary');
  });

  it('sees through l33t substitutions', () => {
    const s = estimateStrength('p@ssw0rd');
    expect(s.sequence.some((m) => m.pattern === 'dictionary')).toBe(true);
    // l33t should not make it meaningfully harder than the plain word
    expect(s.guesses).toBeLessThan(guessesOf(RANDOM_16));
  });

  it('sees through reversed words', () => {
    expect(patternsOf('drowssap')).toContain('dictionary');
  });

  it('matches keyboard walks', () => {
    // Vertical walks down three adjacent columns. Deliberately not 'qwerty' —
    // that is itself a top-ranked password, so the search correctly prefers the
    // cheaper dictionary match and never reports it as spatial.
    expect(patternsOf('tgbyhnujm')).toContain('spatial');
  });

  it('matches repeats', () => {
    expect(patternsOf('aaaaaaaaaaaa')).toContain('repeat');
  });

  it('matches ascending sequences', () => {
    expect(patternsOf('abcdefgh')).toContain('sequence');
  });

  it('matches digit sequences', () => {
    expect(patternsOf('123456789')).toContain('sequence');
  });

  it('falls back to bruteforce for unstructured input', () => {
    expect(patternsOf(RANDOM_16)).toContain('bruteforce');
  });
});

describe('estimateStrength — cheapest-path search', () => {
  it('decomposes a repeated word rather than brute-forcing it', () => {
    const s = estimateStrength('passwordpassword');
    // The DP should cover the string with a couple of cheap matches,
    // not one expensive bruteforce span.
    expect(s.sequence.length).toBeLessThanOrEqual(4);
    expect(s.sequence.some((m) => m.pattern !== 'bruteforce')).toBe(true);
    // and it must be far cheaper than 16 random characters
    expect(s.guesses).toBeLessThan(guessesOf(RANDOM_16));
  });

  it('covers the whole password', () => {
    const pw = 'correct-horse-battery-staple';
    const s = estimateStrength(pw);
    const covered = s.sequence.map((m) => m.token).join('');
    expect(covered).toHaveLength(pw.length);
  });

  it('prefers a known word over bruteforce for the same span', () => {
    // 'monkey' is a very common password; 6 unstructured lowercase chars
    // should cost more to guess than the dictionary hit.
    expect(guessesOf('monkey')).toBeLessThan(guessesOf('xqjvbz'));
  });
});

describe('estimateStrength — ordering and monotonicity', () => {
  it('ranks a common password far below a random one', () => {
    expect(guessesOf('password')).toBeLessThan(guessesOf(RANDOM_16));
  });

  it('gives more guesses to longer random passwords', () => {
    expect(guessesOf('x7Qv#2mK')).toBeLessThan(guessesOf('x7Qv#2mKp9Lz'));
    expect(guessesOf('x7Qv#2mKp9Lz')).toBeLessThan(guessesOf(RANDOM_16));
  });

  it('rewards a larger character set at equal length', () => {
    expect(guessesOf('xqjvbzkw')).toBeLessThan(guessesOf('xQ7v#zK!'));
  });

  it('scores common passwords at the bottom of the scale', () => {
    for (const pw of ['password', '123456', 'qwerty', 'letmein']) {
      expect(estimateStrength(pw).score).toBeLessThanOrEqual(1);
    }
  });

  it('scores a long random password at the top of the scale', () => {
    expect(estimateStrength('x7Qv#2mKp9Lz!4RtW8yB').score).toBe(4);
  });
});

describe('estimateStrength — invariants', () => {
  it('returns an empty result for an empty password', () => {
    const s = estimateStrength('');
    expect(s.guesses).toBe(0);
    expect(s.bits).toBe(0);
    expect(s.score).toBe(0);
    expect(s.sequence).toEqual([]);
  });

  it('keeps bits as log2 of guesses', () => {
    for (const pw of ['password', 'qwerty123', RANDOM_16, 'aaaa']) {
      const s = estimateStrength(pw);
      expect(s.bits).toBeCloseTo(Math.log2(s.guesses), 6);
    }
  });

  it('always produces a score in 0..4', () => {
    for (const pw of ['a', 'password', 'Tr0ub4dour&3', RANDOM_16, 'x'.repeat(200)]) {
      const s = estimateStrength(pw);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(4);
    }
  });

  it('reports one crack-time scenario set per estimate', () => {
    const s = estimateStrength('password');
    expect(s.scenarios.length).toBeGreaterThan(0);
    for (const sc of s.scenarios) {
      expect(typeof sc.time).toBe('string');
      expect(sc.time.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic', () => {
    const a = estimateStrength('Tr0ub4dour&3');
    const b = estimateStrength('Tr0ub4dour&3');
    expect(a.guesses).toBe(b.guesses);
    expect(a.sequence.map((m) => m.token)).toEqual(b.sequence.map((m) => m.token));
  });

  it('handles unusual input without throwing', () => {
    for (const pw of [' ', '\t\n', '🔐🔐🔐', 'ünïcödé', 'a'.repeat(500)]) {
      expect(() => estimateStrength(pw)).not.toThrow();
    }
  });

  it('gives weak passwords actionable feedback', () => {
    const s = estimateStrength('password');
    expect(s.feedback.warning.length + s.feedback.suggestions.length).toBeGreaterThan(0);
  });
});

describe('analyze — the UI-facing wrapper', () => {
  it('returns a zeroed analysis for an empty password', () => {
    const a = analyze('');
    expect(a.bits).toBe(0);
    expect(a.length).toBe(0);
    expect(a.classes).toEqual([]);
  });

  it('detects character classes', () => {
    expect(analyze('abc').classes).toEqual(['lower']);
    expect(analyze('ABC').classes).toEqual(['upper']);
    expect(analyze('aB1!').classes).toEqual(['lower', 'upper', 'number', 'symbol']);
  });

  it('keeps the tier consistent with the reported bits', () => {
    for (const pw of ['password', 'Tr0ub4dour&3', RANDOM_16]) {
      const a = analyze(pw);
      expect(a.tier).toBe(tier(a.bits));
      expect(a.tierInfo).toBeDefined();
    }
  });

  it('always leaves a note', () => {
    expect(analyze(RANDOM_16).notes.length).toBeGreaterThan(0);
  });
});

describe('entropy-core — generation maths', () => {
  it('computes the pool size from the enabled sets', () => {
    expect(poolSize({ lower: true })).toBe(SETS.lower.length);
    expect(poolSize({ lower: true, upper: true })).toBe(
      SETS.lower.length + SETS.upper.length,
    );
  });

  it('computes bits as length * log2(pool)', () => {
    expect(bitsRandom(10, 64)).toBeCloseTo(60, 6);
    expect(bitsRandom(0, 64)).toBe(0);
  });

  it('classifies characters', () => {
    expect(classOf('a')).toBe('lower');
    expect(classOf('Z')).toBe('upper');
    expect(classOf('7')).toBe('number');
    expect(classOf('#')).toBe('symbol');
  });

  it('generates passwords of the requested length from the requested sets', () => {
    const res = generateRandom({
      length: 24, lower: true, upper: false, number: false, symbol: false,
      avoidAmbiguous: false,
    });
    expect(res.value).toHaveLength(24);
    expect(res.value.split('').every((ch) => SETS.lower.includes(ch))).toBe(true);
  });

  it('does not repeat itself across calls', () => {
    const opts = {
      length: 20, lower: true, upper: true, number: true, symbol: true,
      avoidAmbiguous: false,
    };
    const seen = new Set(Array.from({ length: 50 }, () => generateRandom(opts).value));
    expect(seen.size).toBe(50);
  });

  it('generates passphrases from the bundled wordlist', () => {
    const res = generateWords({ count: 5, separator: '-', number: false, capitalize: false });
    const parts = res.value.split('-');
    expect(parts).toHaveLength(5);
    expect(parts.every((w) => WORDS.includes(w.toLowerCase()))).toBe(true);
  });
});
