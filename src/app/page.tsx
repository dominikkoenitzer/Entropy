import Entropy from '@/components/Entropy';

export default function Home() {
  return (
    <main>
      {/* Semantic heading + intro for search engines, AI crawlers, and screen
          readers. Visually hidden so the poster design is untouched; the text
          is an accurate description of the tool, not keyword stuffing. */}
      <h1 className="sr-only">
        Entropy: a local-only password generator and strength analyzer
      </h1>
      <p className="sr-only">
        Generate random passwords and memorable passphrases, measure their
        entropy in bits, and estimate crack time, entirely in your browser.
        Nothing you type or generate ever leaves your device.
      </p>
      <Entropy />

      {/* Poster back matter: how the tool actually works, in visible prose.
          Facts only, mirrored from the engine and the README. */}
      <div className="about">
        <section>
          <h2>How generation works</h2>
          <p>
            Random passwords are drawn with the Web Crypto API
            (<code>crypto.getRandomValues</code>) using unbiased rejection
            sampling, never <code>Math.random()</code>. Passphrases come from
            the bundled EFF wordlist. Strength is counted in bits of entropy,
            and every added bit doubles the number of guesses an attacker
            needs.
          </p>
        </section>
        <section>
          <h2>How analysis works</h2>
          <p>
            The analyzer is a zxcvbn-grade estimator. It matches dictionary
            words (including reversed and l33t variants), keyboard walks,
            repeats, sequences and dates, then finds the cheapest attack path
            and prices it for five attacker scenarios. Ratings are calibrated
            to an offline attacker at roughly 10¹⁰ guesses per second, so a
            label never contradicts the crack time next to it.
          </p>
        </section>
        <section>
          <h2>Why local-only</h2>
          <p>
            There is no backend, no API and no storage: generation and
            analysis run entirely in your browser, and the dictionaries are
            bundled at build time. Nothing you type or generate is ever sent
            anywhere; the only network traffic is page-view analytics.
          </p>
        </section>
      </div>

      <footer className="foot">
        <span>© 2026 dominikkoenitzer</span>
        <nav aria-label="Footer">
          <a href="https://github.com/dominikkoenitzer/Entropy">Source · MIT</a>
          <a href="https://dk.punds.ch">Author</a>
          <a href="/.well-known/security.txt">Security</a>
        </nav>
      </footer>
    </main>
  );
}
