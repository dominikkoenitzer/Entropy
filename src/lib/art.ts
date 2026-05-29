/* ============================================================
   art.ts — the "entropy made visible" contour generator.
   A seeded PRNG (mulberry32) drives warped horizontal contour
   lines, clipped to a circle. Reseeds on every generate.
   Pure: returns SVG path data for React to render.
   ============================================================ */

export interface Art {
  paths: string[];
  cx: number;
  cy: number;
  r: number;
  seedLabel: string;
}

export const ART_WIDTH = 800;
export const ART_HEIGHT = 300;

// seeded RNG for the art
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// fresh 32-bit unsigned seed
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

// build warped contour art clipped to a circle
export function buildArt(seed: number): Art {
  const rnd = mulberry32(seed);
  const W = ART_WIDTH;
  const H = ART_HEIGHT;
  const cx = W / 2;
  const cy = H / 2;
  const r = 120;
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

  const paths: string[] = [];
  const lines = 30;
  for (let i = 0; i < lines; i++) {
    const baseY = (H / (lines - 1)) * i;
    let d = '';
    for (let x = 0; x <= W; x += 7) {
      let y = baseY;
      octaves.forEach((o) => {
        y += o.amp * Math.sin(x * o.f + o.p + i * 0.11);
      });
      const dx = x - bump.x;
      const dy = baseY - bump.y;
      y += bump.amp * Math.exp(-(dx * dx + dy * dy) / (bump.w * bump.w));
      d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    paths.push(d);
  }

  const seedLabel = seed.toString(36).toUpperCase().slice(-4).padStart(4, '0');
  return { paths, cx, cy, r, seedLabel };
}
