import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

/**
 * Web App Manifest — installability + correct theming when added to a home
 * screen, and a positive PWA/SEO signal. The icon is served by app/icon.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.title,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: SITE.background,
    theme_color: SITE.themeColor,
    categories: ['utilities', 'security', 'productivity'],
    lang: 'en',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
