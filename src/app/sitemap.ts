import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

/** sitemap.xml. Single-page app, so one canonical entry. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      // Bump by hand when page content actually changes. `new Date()` here
      // meant every deploy rewrote lastmod, teaching Google the signal is
      // meaningless.
      lastModified: '2026-08-30',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
