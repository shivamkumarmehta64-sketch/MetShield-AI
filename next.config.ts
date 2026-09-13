import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
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
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://server.arcgisonline.com https://upload.wikimedia.org; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.imd.gov.in https://wttr.in https://api.weatherstack.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://server.arcgisonline.com https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';",
  },
];

const nextConfig: NextConfig = {
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
