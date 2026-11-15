import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content-Security-Policy, built per environment.
 *
 * `unsafe-eval` was previously shipped to production. Turbopack's dev server
 * needs `eval` for HMR; a production bundle does not, and leaving it in hands an
 * injected string an execution primitive. `unsafe-inline` remains because Next's
 * bootstrap script is inline without a nonce — removing that needs a nonce
 * pipeline, which is a larger change than this one.
 */
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    // No `preload`, and no `includeSubDomains`: this app is served from a
    // `*.vercel.app` tenant, so asserting a policy over the parent domain is a
    // claim the deployment cannot honour and cannot withdraw.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000',
  },
  {
    // Deprecated. `1; mode=block` enabled the legacy XSS auditor, whose
    // heuristics introduced their own vulnerabilities. Modern browsers ignore
    // it; `0` states the intent explicitly and avoids the auditor where it
    // still exists.
    key: 'X-XSS-Protection',
    value: '0',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://server.arcgisonline.com https://upload.wikimedia.org; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.imd.gov.in https://wttr.in https://api.weatherstack.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://server.arcgisonline.com https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';`,
  },
];

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
