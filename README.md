<div align="center">

# Entropy

### Good passwords. Zero nonsense.

A **local-only** password generator and analyzer with a Y2K poster aesthetic. Generate crypto-strong secrets, see exactly how long they'd survive an attacker — and nothing you type ever leaves your device.

[![CI](https://github.com/dominikkoenitzer/Entropy/actions/workflows/ci.yml/badge.svg)](https://github.com/dominikkoenitzer/Entropy/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-entropy.punds.ch-ccff00?logo=vercel&logoColor=black)](https://entropy.punds.ch)
[![tests](https://img.shields.io/badge/tests-33%20passing-ccff00)](src/lib/strength.test.ts)
[![Local only](https://img.shields.io/badge/data-100%25%20local-ff00aa)](https://entropy.punds.ch)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.3-fbf0df?logo=bun&logoColor=black)

**[→ Try it at entropy.punds.ch](https://entropy.punds.ch)**

</div>

---

> [!IMPORTANT]
> **Everything runs in your browser.** Entropy has no backend, no API routes, and no persistence — passwords are generated and analyzed entirely on-device and are never sent anywhere. The only network traffic is privacy-respecting page-view analytics (`@vercel/analytics`), which never sees password values.

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Privacy](#privacy)
- [Project structure](#project-structure)
- [Deployment & CI/CD](#deployment--cicd)
- [Author](#author)

## Features

- **Generate** — crypto-strong random passwords and passphrases. Randomness comes from `crypto.getRandomValues` with unbiased rejection sampling — **never** `Math.random()` for password material. Tune length or word count, toggle character sets, and watch the entropy (in bits) count up live.
- **Passphrases** — word-based secrets drawn from the bundled **EFF wordlist**, for memorable-yet-strong credentials.
- **Analyze** — paste any password and get a **zxcvbn-grade** strength estimate: it matches dictionary words (including reversed + l33t), keyboard walks, repeats, sequences, and dates, brute-forces at the password's true cardinality, and finds the *cheapest* attack path via dynamic programming.
- **Real crack times** — strength is reported as five attacker scenarios with an attack-path decomposition and actionable feedback. Tiers are calibrated to an **offline attacker (~10¹⁰ guesses/sec)**, so the label never contradicts the time.
- **Entropy, made visible** — a seeded generative-art renderer turns each secret into SVG contour art.
- **Keyboard-first** — `r` to regenerate, `c` to copy. Respects `prefers-reduced-motion`.

## How it works

Entropy keeps **pure logic** (`src/lib/`) separate from **React UI** (`src/components/`) — every logic module is DOM-free and deterministic where possible:

- **`entropy-core.ts`** — the generation engine: character sets, crypto-strong random generation, entropy math, strength tiers, and `crackTime(bits)`.
- **`strength.ts`** — the analysis engine: a self-contained zxcvbn-grade guess estimator that finds the cheapest attack path and returns guesses → bits → crack times + feedback.
- **`analyze.ts`** — a thin wrapper that's **dynamically imported**, so the ~90 KB dictionaries are code-split out of first paint and the generate path stays light.
- Wordlists and analyzer dictionaries are **generated at build time** (`bun run dict` downloads reputable lists), then committed and bundled — so there's **no runtime network**.

## Tech stack

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) + **[React 19](https://react.dev/)**
- **[TypeScript 5](https://www.typescriptlang.org/)** — pure, DOM-free logic modules
- **[Tailwind CSS 4](https://tailwindcss.com/)** with a hand-written Y2K theme
- Self-hosted **Anton / Space Grotesk / JetBrains Mono** via `next/font` (no runtime Google request)
- **[Vercel](https://vercel.com/)** hosting + privacy-respecting `@vercel/analytics`
- **No backend** — 100% client-side

Package manager: **Bun**.

## Getting started

**Prerequisites:** [Bun](https://bun.sh/) 1.1.39+ (this repo pins `1.3.14` via `.bun-version`). Bun is the runtime and package manager.

```bash
# Clone
git clone https://github.com/dominikkoenitzer/Entropy.git
cd Entropy

# Install dependencies
bun install

# Start the dev server → http://localhost:3000
bun run dev
```

No configuration or API keys — Entropy runs entirely client-side.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Dev server with Turbopack on [http://localhost:3000](http://localhost:3000) |
| `bun run build` | Production build (also the primary correctness check) |
| `bun run start` | Serve the production build |
| `bun run type-check` | `tsc --noEmit` |
| `bun run lint` | ESLint (`eslint-config-next`) |
| `bun run test` | Vitest suite for the estimation engine |
| `bun run dict` | Regenerate the bundled wordlists (downloads at build time) |

> [`src/lib/strength.test.ts`](src/lib/strength.test.ts) covers the engine directly: one case per matcher (dictionary, l33t, reversed, spatial, repeat, sequence, bruteforce), the cheapest-path search, monotonicity of guesses in length and character set, and the `bits === log₂(guesses)` invariant. CI runs typecheck, lint, tests and build on every push and PR.

## Privacy

Privacy isn't a feature here — it's the whole point.

- **Nothing leaves the device.** Generation and analysis run entirely in your browser. There is no backend, no API, and no storage of any secret.
- **Crypto-grade randomness.** Password material uses `crypto.getRandomValues`, never `Math.random()`.
- **No runtime network.** Dictionaries are downloaded once at build time and bundled; the app makes no network calls for its core function.
- **Analytics see page views only** — never the contents of any field.

## Project structure

```
src/
├── app/            # Next.js App Router (page.tsx → <Entropy />, layout, globals.css)
├── components/     # Entropy, EntropyGenerate, EntropyAnalyze, EntropyArt, Glyphs
└── lib/            # Pure logic: entropy-core, strength, analyze, format, art, ui
                    # + generated, committed wordlists/dictionaries
scripts/
└── build-dict.mjs  # Regenerates the bundled wordlists (build-time downloads)
```

## Deployment & CI/CD

Entropy is a static site deployed on **[Vercel](https://vercel.com/)** (live at **[entropy.punds.ch](https://entropy.punds.ch)**).

GitHub Actions:

- **[`ci.yml`](.github/workflows/ci.yml)** — on every push and pull request to `main`: install, **type-check**, and **build**.
- **[`deploy.yml`](.github/workflows/deploy.yml)** — optional production deploy via the Vercel CLI, gated on the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets; a no-op otherwise (Vercel's Git integration handles deploys by default).

[Dependabot](.github/dependabot.yml) keeps Bun and GitHub Actions dependencies current weekly.

## Author

Made by **[Dominik Könitzer](https://github.com/dominikkoenitzer)** · [entropy.punds.ch](https://entropy.punds.ch)
