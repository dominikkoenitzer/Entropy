import Entropy from '@/components/Entropy';

export default function Home() {
  return (
    <main>
      {/* Semantic heading + intro for search engines, AI crawlers, and screen
          readers. Visually hidden so the poster design is untouched; the text
          is an accurate description of the tool, not keyword stuffing. */}
      <h1 className="sr-only">
        Entropy — free, local-only password generator and strength analyzer
      </h1>
      <p className="sr-only">
        Generate cryptographically-strong random passwords and memorable
        passphrases, measure their entropy in bits, and estimate crack time —
        entirely in your browser. Nothing you type or generate ever leaves your
        device.
      </p>
      <Entropy />
    </main>
  );
}
