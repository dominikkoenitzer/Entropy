/* ============================================================
   strength-data.ts — reference data for the guess-estimation engine.

   The ranked dictionaries (common passwords, English words, names, surnames)
   are DOWNLOADED at build time by scripts/build-dict.mjs and live in
   ./strength-dict.generated. They are bundled — there is no runtime network
   call, consistent with the project's local-only constraint. To refresh them:
   `pnpm dict`.

   This module owns the small, stable, hand-authored data: the l33t-speak
   substitution table and the keyboard adjacency graphs built from physical
   layouts.
   ============================================================ */

import { PASSWORDS, ENGLISH, FIRST_NAMES, SURNAMES } from './strength-dict.generated';

const split = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);

export interface RankedDictionary {
  name: string;
  ranks: Map<string, number>; // token → rank (1-based)
}

function ranked(name: string, words: readonly string[]): RankedDictionary {
  const ranks = new Map<string, number>();
  words.forEach((w, i) => {
    const k = w.toLowerCase();
    if (!ranks.has(k)) ranks.set(k, i + 1);
  });
  return { name, ranks };
}

export const DICTIONARIES: RankedDictionary[] = [
  ranked('passwords', PASSWORDS),
  ranked('english', ENGLISH),
  ranked('names', FIRST_NAMES),
  ranked('surnames', SURNAMES),
];

/** l33t-speak: cipher char → plausible real letters it stands in for. */
export const L33T_TABLE: Record<string, string[]> = {
  '4': ['a'],
  '@': ['a'],
  '8': ['b'],
  '(': ['c'],
  '{': ['c'],
  '[': ['c'],
  '<': ['c'],
  '3': ['e'],
  '6': ['g'],
  '9': ['g'],
  '1': ['i', 'l'],
  '!': ['i'],
  '|': ['i', 'l'],
  '0': ['o'],
  '$': ['s'],
  '5': ['s'],
  '7': ['t'],
  '+': ['t'],
  '2': ['z'],
};

// --- keyboard adjacency graphs ---------------------------------------
// Tokens are "unshifted[shifted]" (e.g. "1!"). Rows are laid out with a
// half-key stagger so each key gets up to six neighbours (hex adjacency),
// matching how fingers actually walk a physical keyboard.

const QWERTY_ROWS = [
  '`~ 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+',
  'qQ wW eE rR tT yY uU iI oO pP [{ ]} \\|',
  'aA sS dD fF gG hH jJ kK lL ;: \'"',
  'zZ xX cC vV bB nN mM ,< .> /?',
];

const KEYPAD_ROWS = [
  '/ * -',
  '7 8 9 +',
  '4 5 6',
  '1 2 3',
  '0 .',
];

export interface KeyboardGraph {
  name: string;
  graph: Record<string, (string | null)[]>; // char → 6 directional neighbour tokens
  shifted: Set<string>;                       // chars that require Shift
  starts: number;                             // distinct keys
  avgDegree: number;                          // mean neighbours per key
}

// Clockwise from up-left for a slanted layout.
const SLANTED_DIRS: ReadonlyArray<[number, number]> = [
  [-0.5, -1], [0.5, -1], [1, 0], [0.5, 1], [-0.5, 1], [-1, 0],
];
// Aligned grid (keypad): full eight-direction grid.
const ALIGNED_DIRS: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0],
];

function buildGraph(name: string, rows: string[], slanted: boolean): KeyboardGraph {
  const dirs = slanted ? SLANTED_DIRS : ALIGNED_DIRS;
  const coord = new Map<string, string>(); // "x,y" → token
  const shifted = new Set<string>();
  rows.forEach((row, y) => {
    split(row).forEach((token, col) => {
      const x = col + (slanted ? y * 0.5 : 0);
      coord.set(`${x},${y}`, token);
      if (token.length > 1) for (const ch of token.slice(1)) shifted.add(ch);
    });
  });

  const graph: Record<string, (string | null)[]> = {};
  let degSum = 0;
  let keys = 0;
  rows.forEach((row, y) => {
    split(row).forEach((token, col) => {
      const x = col + (slanted ? y * 0.5 : 0);
      const neighbors = dirs.map(([dx, dy]) => coord.get(`${x + dx},${y + dy}`) ?? null);
      const present = neighbors.filter(Boolean).length;
      for (const ch of token) {
        graph[ch] = neighbors;
        degSum += present;
        keys += 1;
      }
    });
  });

  return { name, graph, shifted, starts: keys, avgDegree: keys ? degSum / keys : 0 };
}

export const KEYBOARDS: KeyboardGraph[] = [
  buildGraph('qwerty', QWERTY_ROWS, true),
  buildGraph('keypad', KEYPAD_ROWS, false),
];
