import type { Metadata, Viewport } from 'next';
import { Anton, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SITE, KEYWORDS, structuredData } from '@/lib/seo';
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
  // metadataBase makes every relative OG/Twitter/canonical URL absolute — the
  // dynamic opengraph-image, twitter-image, icon and manifest routes resolve
  // against this origin automatically.
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: KEYWORDS,
  authors: [{ name: SITE.author }],
  creator: SITE.author,
  publisher: SITE.name,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: SITE.locale,
    // images resolved from app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
    creator: SITE.twitter,
    // images resolved from app/twitter-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  // PWA manifest resolved from app/manifest.ts; icons from app/icon.tsx etc.
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
  themeColor: SITE.themeColor,
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
        {/* schema.org structured data — rich results for search engines and an
            explicit, machine-readable description for AI crawlers. */}
        <script
          type="application/ld+json"
          // Static, build-time JSON from our own config — no user/secret input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
