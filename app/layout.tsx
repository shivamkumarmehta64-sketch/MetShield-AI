import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

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
  title: 'MetShield AI | AWS-QMS — SIH 2026',
  description:
    'Real-time WMO Pub 8 Quality Control for India\'s 1,350+ Automatic Weather Stations. Team AEROTECH — SIH26073.',
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary font-sans selection:bg-accent-primary selection:text-white">
        {children}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="register-sw"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(
                      function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                      },
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
