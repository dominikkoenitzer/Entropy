import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Without this file the root layout's metadata cascades into Next's built-in
 * not-found page, so every 404 carried an "index, follow" robots tag arguing
 * with the built-in noindex, plus a canonical pointing at the homepage.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center gap-4 text-center">
      <h1>404</h1>
      <p>This page does not exist.</p>
      <Link href="/">Back to the generator</Link>
    </main>
  );
}
