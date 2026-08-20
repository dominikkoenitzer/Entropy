# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public GitHub issue for anything security-sensitive.

- Preferred: open a [private security advisory](https://github.com/dominikkoenitzer/Entropy/security/advisories/new) on this repository.
- Alternatively: email **dominik.koenitzer@gmail.com** with the details.

Please include:

- a description of the issue and its impact,
- steps to reproduce (a URL, request, or minimal example), and
- any relevant logs, screenshots, or proof of concept.

## What to expect

- An acknowledgement of your report, typically within a few days.
- An assessment and, where applicable, a fix deployed to the live site.
- Credit for the report if you would like it, once the issue is resolved.

## Scope

Entropy generates and analyses passwords **entirely in the browser**. There is no account, no database, and no request that carries a password anywhere: nothing typed or generated leaves the device.

Because the product *is* a security claim, the reports that matter most are the ones that would make that claim untrue:

- **Weak or predictable generation.** Passwords come from `crypto.getRandomValues` with unbiased rejection sampling (`src/lib/entropy-core.ts`). Any bias, any fallback to `Math.random`, or any path where the requested character classes are not actually enforced is a real bug. `Math.random` appears only in `src/lib/art.ts`, which draws decoration and never touches a password.
- **A strength estimate that is wrong in the unsafe direction** — a password the estimator calls strong that a real attacker cracks cheaply. The estimator is a from-scratch pattern matcher plus a shortest-path search; a missing pattern class is a security finding, not a feature request.
- **Anything that gets a generated or analysed password off the device**: a network call, a leak into a URL, an unexpected clipboard or storage write.
- **Content injection** into the page, and **dependency vulnerabilities** with a plausible path to the browser.

Out of scope: reports that require an attacker to already control the visitor's machine or browser.
