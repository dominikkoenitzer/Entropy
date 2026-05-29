# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Entropy is a **local-only** password generator and analyzer — a single-page Next.js app with a Y2K "poster" aesthetic. Nothing a user types or generates ever leaves the device; there is no backend, no API routes, no persistence. Privacy is a hard product constraint, not a nice-to-have: do not introduce network calls, telemetry of secret values, or server-side handling of passwords. (The only network dependency is `@vercel/analytics`, which sees pageviews — never password values.)

## Commands

```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # production build — also the primary correctness check
pnpm type-check   # tsc --noEmit
pnpm start        # serve a production build
```

There are no tests. **`pnpm lint` is broken** — `next lint` was removed in Next.js 16 and this repo has no flat ESLint config yet. Verify changes with `pnpm type-check` and `pnpm build` instead; ignore any output from `pnpm lint`.

## Architecture

The codebase separates **pure logic** (`src/lib/`) from **React UI** (`src/components/`). All logic modules are DOM-free and deterministic-where-possible, so the UI layer stays thin.

- **`src/lib/entropy-core.ts`** — the password engine. Character sets, crypto-strong random generation (`generateRandom`, `generateWords`), entropy math (`bitsRandom`, `bitsWords`), strength tiers, crack-time estimates, and `analyze()` for arbitrary passwords. This is a faithful port of an upstream `entropy-core.js`; the header comment says **"Do not re-derive the math."** Preserve the existing formulas and constants (guesses/sec, tier thresholds, penalty rules) unless explicitly asked to change them. Randomness uses `crypto.getRandomValues` with unbiased rejection sampling (`randInt`) — never `Math.random()` for password material.
- **`src/lib/art.ts`** — the "entropy made visible" generative art. A seeded PRNG (`mulberry32`) produces SVG contour paths. `randomSeed()` uses `Math.random()` (cosmetic only, not security-sensitive). Pure: returns path data, no DOM.
- **`src/lib/ui.ts`** — small client helpers (`prefersReducedMotion`, `copyText` with an execCommand fallback).

Component tree (all under `src/app/page.tsx` → `<Entropy />`):

- **`Entropy.tsx`** — shell + Generate/Analyze mode tabs.
- **`EntropyGenerate.tsx`** — the bulk of the interactive logic: config state, length/word sliders, character-set toggles, history, keyboard shortcuts (`r` regenerate, `c` copy), and the count-up bits animation.
- **`EntropyAnalyze.tsx`** — calls `analyze()` during render (analysis is cheap/instant) and shows strength, crack time, composition.
- **`EntropyArt.tsx`** — memoized SVG renderer for `buildArt(seed)`.
- **`Glyphs.tsx`** — inline SVG star/warning icons (used instead of Unicode glyphs so platforms can't substitute color emoji).

### Conventions and gotchas

- **Path alias:** `@/*` → `./src/*`.
- **Hydration safety:** the art seed is deterministically `0` on first render (server + client match) and only set to a real `randomSeed()` in a mount effect. Keep generation that depends on randomness out of the initial render to avoid hydration mismatches.
- **StrictMode** is on (`next.config.ts`), which double-invokes effects in dev. First-generation and other once-only effects are guarded with refs (e.g. `inited.current`) — follow that pattern.
- **Styling** is one global stylesheet, `src/app/globals.css` (Tailwind v4 via `@import "tailwindcss"` + a large hand-written Y2K theme). The palette and fonts are CSS variables on `:root` / `<html>` (`--acid`, `--mag`, `--ff-anton`, etc.). Components reference semantic class names (`.poster`, `.rail`, `.stage`, `.pw`, …) defined there rather than utility classes. Weak strength is rendered in magenta (`--mag`), strong in acid green (`--acid`) — a tier ≤ 1 check drives this in several components.
- **Fonts** (Anton, Space Grotesk, JetBrains Mono) are self-hosted via `next/font/google` at build time — no runtime request to Google. Don't replace with `<link>` tags.
- `'use client'` is required on every interactive component; the lib modules and `page.tsx`/`layout.tsx` stay server-compatible.
