import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * `'unsafe-eval'` is a dev-only requirement: Turbopack's dev overlay and
 * React's dev-time source eval need it. A production Next build does not, and
 * leaving it in production hands an attacker a script-execution primitive if
 * they ever get past CSP. `'unsafe-inline'` does have to stay — Next inlines
 * the RSC payload and hydration bootstrap without a nonce here.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://server.arcgisonline.com https://upload.wikimedia.org",
  "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.imd.gov.in https://wttr.in https://api.weatherstack.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://server.arcgisonline.com https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Legacy XSS filter. Audit-mode only — modern browsers have retired it and it
  // has caused more false positives than it has blocked XSS.
  { key: "X-XSS-Protection", value: "0" },
  // Must stay consistent with CSP frame-ancestors 'none' and with the value
  // the proxy layer sets, or browsers pick the weaker of the two.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "index, follow" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Drops the standalone `node_modules` copy from the Vercel image. The
  // function bundle already resolves its own deps; this only matters for
  // self-hosted Docker deploys, and costs a few seconds of build per deploy.
  output: process.env.VERCEL ? undefined : "standalone",
  async headers() {
    return [
      // 1. Everything (HTML documents, images, anything not matched below).
      //    Revalidate on the CDN so a deploy propagates within a minute without
      //    every request hitting origin. `/_next/static/*` is deliberately not
      //    called out — those assets are content-hashed and Next already stamps
      //    them `immutable`; overriding that is not permitted and warns.
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=3600" },
          ...securityHeaders,
        ],
      },
      // 2. The API must come LAST. Next resolves overlapping rules in order and
      //    the later value wins, so this `no-store` has to overwrite rule 1's
      //    `s-maxage` for API routes that don't declare their own policy.
      //    The telemetry and weather routes do declare per-response values
      //    (60s station list, 15s live observation, 2s packet deltas) and those
      //    win over this rule — which is the intent, so the fallback is
      //    deliberately `no-store` rather than another guessed TTL.
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
