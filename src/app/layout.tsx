import type { Metadata, Viewport } from 'next';
import { Anton, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

// All three are self-hosted by next/font (downloaded at build time, no runtime
// request to Google) — never substituted. Weights match the design spec exactly.
const anton = Anton({
  weight: '400', // Anton ships a single weight
  subsets: ['latin'],
  variable: '--ff-anton',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--ff-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--ff-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'entropy — password generator',
  description:
    'Good passwords. Zero nonsense. A local-only, cryptographically-strong password generator and analyzer.',
  keywords: ['password generator', 'passphrase', 'entropy', 'secure password', 'local', 'privacy', 'y2k'],
  authors: [{ name: 'entropy' }],
  openGraph: {
    title: 'entropy',
    description: 'Good passwords. Zero nonsense.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${anton.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
