import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ClientProvider from './dashboard/ClientProvider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  // Relative og:image / twitter:image URLs resolve against this base; without
  // it, crawlers receive a path with no host and render no card at all.
  metadataBase: new URL('https://aws2026-nu.vercel.app'),
  title: 'MetShield AI | AWS-QMS — SIH 2026',
  description:
    'QC rules aligned with applicable WMO-No. 8 guidance for Automatic Weather Stations. Team AEROTECH — SIH26073.',
  keywords: [
    'MetShield AI', 'AWS-QMS', 'SIH 2026', 'MoES', 'IMD',
    'Weather Station', 'Quality Management', 'AEROTECH',
  ],
  authors: [{ name: 'Team AEROTECH', url: 'https://aws2026-nu.vercel.app' }],
  openGraph: {
    title: 'MetShield AI — National AWS Telemetry Shield',
    description: 'SIH26073 · Ministry of Earth Sciences · Team AEROTECH',
    url: 'https://aws2026-nu.vercel.app',
    siteName: 'MetShield AI',
    locale: 'en_IN',
    type: 'website',
    images: [{
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'MetShield AI — automatic weather station quality control. Know whether the atmosphere changed, or the sensor did.',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetShield AI — National AWS Telemetry Shield',
    description: 'SIH26073 · Ministry of Earth Sciences · Team AEROTECH',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/metshield-logo.jpg',
    apple: '/metshield-logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // §23 accessibility: `userScalable: false` and `maximumScale: 1` block
  // pinch-zoom, which fails WCAG 1.4.4. Zoom is a user right, so the app
  // stops preventing it. This was the single worst a11y defect found in the
  // audit: the previous build disabled zooming on every page.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('metshield-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* Keyboard users land here first; visually hidden until focused.
            Targets #main-content, which every primary surface declares. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-navy focus:px-3 focus:py-2 focus:text-white focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <ClientProvider>
          {children}
        </ClientProvider>
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="register-sw"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    // No success log: this string is injected verbatim, so the
                    // build's removeConsole pass cannot strip it and it would
                    // print on every production page load. Failures still surface.
                    navigator.serviceWorker.register('/sw.js').then(
                      function() {},
                      function(err) {
                        console.error('ServiceWorker registration failed: ', err);
                      }
                    );
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
