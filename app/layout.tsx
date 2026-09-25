import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
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
  title: 'Metshield AI | Automated Weather Station Quality Management System (AWS-QMS)',
  description:
    'Metshield AI — Automated Weather Station Quality Management System (AWS-QMS). Real-time WMO Pub 8 Quality Control, edge anomaly detection, and predictive maintenance.',
  keywords: [
    'Metshield AI', 'Metshield-QMS', 'Automatic Weather Station', 'Weather Telemetry',
    'Sensor Health Check', 'WMO Pub 8', 'India Weather Network', 'Predictive Maintenance',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/metshield-logo.jpg',
    apple: '/metshield-logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased theme-console`}>
      {/* Surfaces and ink come from the token system (app/tokens.css). Each route
          opts into the dark field ramp with `.theme-field` when it needs it. */}
      <body className="min-h-full flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-subtle)] selection:text-[var(--text-primary)]">
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

