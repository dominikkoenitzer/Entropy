# Contributing

Thanks for taking an interest in **Entropy**. This guide covers local setup, the conventions the codebase follows, and how to get a change merged.

## Local setup

Requires [bun](https://bun.sh).

```bash
bun install
bun run dev        # http://localhost:3000
```

`bun run dict` regenerates the word list used by the passphrase generator; run it only when the source list changes and commit the result.

## Before you open a pull request

Run the same gate that CI runs — all four must pass:

```bash
bun run lint
bun run type-check
bun run test
bun run build
```

## Code style

- **Next.js 16 App Router with Turbopack.** `params` is a `Promise` and must be awaited in pages and `generateMetadata`.
- **Tailwind v4, configured in CSS.** There is no `tailwind.config.*`; the Y2K palette and the fluid spacing scale live in `src/app/globals.css` as custom properties. Use the tokens (`--acid`, `--mag`, `--ink-dim`, `--shell-pad`, …) rather than literal values, and keep new text at 4.5:1 or better against the surface it sits on — `--ink-dim` is tuned to exactly that.
- **The estimator is the product.** `src/lib/entropy-core.ts` is pure, dependency-free and unit-tested. Changes there need a test that pins the new behaviour, and a note on why the old score was wrong.
- **No dependencies for the security-relevant path.** Password generation and strength estimation must not gain a runtime dependency; the point of the project is that they are auditable in one file.

## Commits and pull requests

- Keep commits focused, with a short imperative subject.
- Describe what you changed and how you verified it.

## Reporting bugs and requesting features

Use the issue forms under **New issue**. For anything security-sensitive, do **not** open a public issue — follow [SECURITY.md](SECURITY.md) instead.
