/**
 * Single source of truth for site-wide metadata.
 * Imported by layout (metadata + JSON-LD), sitemap, robots, manifest, and the
 * dynamic OG/Twitter/icon image routes so every surface stays in sync.
 *
 * No password material is ever referenced here. This is purely public,
 * build-time descriptive metadata, consistent with the project's local-only
 * privacy constraint.
 */

export const SITE = {
  /** Canonical production origin, with no trailing slash. */
  url: 'https://entropy.punds.ch',
  name: 'Entropy',
  /** Used as the default <title> and OG title. */
  title: 'Entropy: password generator and strength analyzer',
  /** Kept under 160 characters so search results do not truncate it. */
  description:
    'Generate random passwords and passphrases, or paste one you already use and see its entropy in bits and estimated crack time. It all runs in your browser.',
  /** Short tagline for OG image + manifest. */
  tagline: 'Good passwords. Zero nonsense.',
  locale: 'en_US',
  author: 'dominikkoenitzer',
  authorUrl: 'https://dk.punds.ch',
  themeColor: '#c6f000',
  background: '#000000',
} as const;

/**
 * The schema.org JSON-LD graph. Only two nodes, because only two genuinely
 * describe this site: the site itself and the app it serves. There is no
 * FAQPage node, since Google only shows those for government and health sites
 * and the answers would not appear anywhere on the page anyway.
 */
export function structuredData() {
  const author = {
    '@type': 'Person',
    '@id': `${SITE.url}/#author`,
    name: SITE.author,
    url: SITE.authorUrl,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      author,
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: 'en',
        author: { '@id': `${SITE.url}/#author` },
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
        isPartOf: { '@id': `${SITE.url}/#website` },
        author: { '@id': `${SITE.url}/#author` },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Random password generation using the Web Crypto API',
          'Memorable passphrase generation',
          'Password entropy measured in bits',
          'Estimated crack time for several attacker scenarios',
          'Strength analysis for a password you already use',
          'Runs entirely in the browser, with no network calls',
        ],
      },
    ],
  };
}
