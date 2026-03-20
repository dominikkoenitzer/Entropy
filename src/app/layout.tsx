import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'entropy',
  description: 'Good passwords. Zero nonsense. Local-only password generator.',
  keywords: ['password generator', 'secure password', 'crypto', 'local', 'privacy', 'hacker'],
  authors: [{ name: 'entropy' }],
  openGraph: {
    title: 'entropy',
    description: 'Good passwords. Zero nonsense.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  );
}
