// Throwaway generator: renders the "entropy made visible" contour art (the same
// motif as EntropyArt) into a square static favicon at src/app/icon.svg.
// Uses the exact buildArt math from src/lib/art.ts for a fixed seed, with
// strokes thickened so the mark stays legible at tab size.
import { writeFileSync } from 'node:fs';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 800, H = 300, cx = W / 2, cy = H / 2, r = 120;
const SEED = 0x5eed; // fixed so the favicon is deterministic

function buildPaths(seed) {
  const rnd = mulberry32(seed);
  const octaves = [
    { amp: 9 + rnd() * 5, f: 0.008 + rnd() * 0.004, p: rnd() * 6.28 },
    { amp: 4 + rnd() * 3, f: 0.016 + rnd() * 0.009, p: rnd() * 6.28 },
  ];
  const bump = {
    x: cx + (rnd() - 0.5) * 110,
    y: cy + (rnd() - 0.5) * 60,
    amp: 12 + rnd() * 13,
    w: 100 + rnd() * 60,
  };
  const paths = [];
  const lines = 30;
  for (let i = 0; i < lines; i++) {
    const baseY = (H / (lines - 1)) * i;
    let d = '';
    for (let x = 0; x <= W; x += 7) {
      let y = baseY;
      octaves.forEach((o) => { y += o.amp * Math.sin(x * o.f + o.p + i * 0.11); });
      const dx = x - bump.x;
      const dy = baseY - bump.y;
      y += bump.amp * Math.exp(-(dx * dx + dy * dy) / (bump.w * bump.w));
      d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    paths.push(d.trim());
  }
  return paths;
}

const paths = buildPaths(SEED);

// Just the circle — no acid field, transparent corners. viewBox is cropped
// tight to the outermost ring so the disc fills the icon edge-to-edge.
const outer = r + 7;               // outer black ring radius (127)
const half = outer + 3;            // tiny breathing room past the stroke (130)
const V = half * 2;                // viewBox side (260)
const vx = cx - half;              // 270
const vy = cy - half;              // 20

const stripes = paths
  .map((d) => `<path d="${d}" fill="none" stroke="#c6f000" stroke-width="4"/>`)
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${V} ${V}">
<defs><clipPath id="c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0b08"/>
<g clip-path="url(#c)">${stripes}</g>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff2e93" stroke-width="6"/>
<circle cx="${cx}" cy="${cy}" r="${outer}" fill="none" stroke="#0a0b08" stroke-width="5"/>
</svg>
`;

writeFileSync(new URL('../src/app/icon.svg', import.meta.url), svg);
console.log('wrote src/app/icon.svg —', svg.length, 'bytes, seed', SEED.toString(16));
