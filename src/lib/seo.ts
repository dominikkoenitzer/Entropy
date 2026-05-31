/**
 * Single source of truth for site-wide SEO / AI-SEO metadata.
 * Imported by layout (metadata + JSON-LD), sitemap, robots, manifest, and the
 * dynamic OG/Twitter/icon image routes so every surface stays in sync.
 *
 * No password material is ever referenced here — this is purely public,
 * build-time descriptive metadata, consistent with the project's local-only
 * privacy constraint.
 */

export const SITE = {
  /** Canonical production origin — no trailing slash. */
  url: 'https://entropy.punds.ch',
  name: 'Entropy',
  /** Used as the default <title> and OG title. */
  title: 'Entropy — Free Local Password Generator & Strength Analyzer',
  /** ~155 chars, keyword-rich but human. Reused as OG/Twitter description. */
  description:
    'Free, local-only password generator and strength analyzer. Create cryptographically-strong random passwords and passphrases, measure entropy in bits, and estimate crack time — entirely in your browser. Nothing you type ever leaves your device.',
  /** Short tagline for OG image + manifest. */
  tagline: 'Good passwords. Zero nonsense.',
  locale: 'en_US',
  author: 'Dominik Könitzer',
  twitter: '@dominikkoenitzer',
  themeColor: '#c6f000',
  background: '#000000',
} as const;

export const KEYWORDS = [
  'password generator',
  'random password generator',
  'strong password generator',
  'passphrase generator',
  'password strength analyzer',
  'password strength checker',
  'entropy calculator',
  'password entropy',
  'crack time estimator',
  'secure password generator',
  'local password generator',
  'offline password generator',
  'privacy password generator',
  'cryptographically secure password',
  'diceware passphrase',
];

/** Natural-language Q&A — feeds FAQPage rich results and is highly legible to
 *  LLM/AI crawlers answering password questions. */
export const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Is Entropy free to use?',
    a: 'Yes. Entropy is completely free, requires no account, and has no ads or paywalls.',
  },
  {
    q: 'Does Entropy send my passwords anywhere?',
    a: 'No. Entropy is local-only. Every password and passphrase is generated and analyzed entirely in your browser using the Web Crypto API. Nothing you type or generate is ever transmitted, stored, or logged on a server.',
  },
  {
    q: 'How does Entropy generate secure passwords?',
    a: 'Entropy uses the browser’s cryptographically-strong random number generator (crypto.getRandomValues) with unbiased rejection sampling — never Math.random — so every character or word is uniformly random and unpredictable.',
  },
  {
    q: 'What is password entropy and why does it matter?',
    a: 'Entropy, measured in bits, quantifies how unpredictable a password is. Each additional bit doubles the number of guesses an attacker needs. More bits means exponentially longer crack times. Entropy shows the exact bit count and estimated time to crack for any password.',
  },
  {
    q: 'Are passphrases stronger than random passwords?',
    a: 'A passphrase of several random words can reach high entropy while staying far easier to remember and type than a random character string of equivalent strength. Entropy generates both so you can compare their entropy directly.',
  },
  {
    q: 'Can I check the strength of a password I already have?',
    a: 'Yes. Switch to Analyze mode and paste any password to see its entropy in bits, a strength rating, estimated crack time, and a breakdown of its character composition — all computed locally in your browser.',
  },
];

/**
 * The schema.org JSON-LD graph for the site. A single @graph with cross-linked
 * nodes (WebSite, WebApplication, Organization, FAQPage) is the cleanest way to
 * give classic search engines rich results and give AI crawlers an explicit,
 * machine-readable description of what this tool is and does.
 */
export function structuredData() {
  const org = { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: SITE.url };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: 'en',
        publisher: { '@id': `${SITE.url}/#org` },
      },
      {
        ...org,
        founder: { '@type': 'Person', name: SITE.author },
      },
      {
        '@type': ['WebApplication', 'SoftwareApplication'],
        '@id': `${SITE.url}/#app`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        applicationCategory: 'SecurityApplication',
        applicationSubCategory: 'Password Generator',
        operatingSystem: 'Any (web browser)',
        browserRequirements: 'Requires JavaScript and the Web Crypto API.',
        inLanguage: 'en',
        isAccessibleForFree: true,
        publisher: { '@id': `${SITE.url}/#org` },
        author: { '@type': 'Person', name: SITE.author },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Cryptographically-strong random password generation',
          'Memorable passphrase generation',
          'Password entropy measured in bits',
          'Password strength rating and crack-time estimate',
          'Analyze the strength of any existing password',
          '100% local — nothing leaves your browser',
        ],
        permissions: 'No special permissions; runs entirely client-side.',
        privacyPolicy: `${SITE.url}`,
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE.url}/#faq`,
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };
}
