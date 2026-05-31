import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

/** sitemap.xml — single-page app, so one canonical entry. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
