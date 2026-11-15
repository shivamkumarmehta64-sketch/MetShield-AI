import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Automated vulnerability scanners. This is NOISE REDUCTION, not a security
// control: a user agent is chosen by the caller, so anything here is one flag
// away from bypassed. It was previously a much longer list that also named
// generic HTTP clients (`python-requests`, `go-http-client`, `java`,
// `postmanruntime`), which blocked legitimate integrations and every scripted
// health check while stopping no attacker. Keep only tools whose default UA no
// real client uses.
const BLOCKED_USER_AGENTS = ['nmap', 'sqlmap', 'nikto', 'masscan', 'zgrab'];

/** Production hosts this deployment is served from. Exact matches only. */
const CANONICAL_HOSTS = ['metshield-ai.vercel.app', 'aws2026-nu.vercel.app'];

/**
 * Extra origins from `ALLOWED_ORIGINS` (comma-separated), for previews and
 * custom domains. Configure these rather than widening the matcher.
 */
function configuredOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Helper to check whether an origin is permitted
function isOriginAllowed(originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    const parsed = new URL(originHeader);
    const host = parsed.hostname.toLowerCase();

    // Allow localhost and local loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return true;
    }

    // Allow internal LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for mobile sensor testing
    if (
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    ) {
      return true;
    }

    // Exact hosts only. This previously accepted `host.endsWith('.vercel.app')`,
    // which meant ANY Vercel deployment — including one an attacker creates for
    // free in a minute — passed the CSRF origin check.
    return CANONICAL_HOSTS.includes(host) || configuredOrigins().includes(host);
  } catch {
    return false;
  }
}

// Default baseline defensive security headers
function attachSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // DENY, matching next.config.ts. These two used to disagree (SAMEORIGIN here,
  // DENY there), and when both are present the browser's behaviour depends on
  // header order rather than on intent.
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Metshield-Edge-Secured', 'true');
  return response;
}

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const pathname = request.nextUrl.pathname;

  // 1. Bot Mitigation (WAF Lite)
  // Block requests that match known automated vulnerability scanners or scraping scripts in production
  if (process.env.NODE_ENV === 'production' && BLOCKED_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    const blockedRes = NextResponse.json(
      { error: 'Forbidden. Automated scraping and malicious bots are blocked by Metshield Edge Firewall.' },
      { status: 403 }
    );
    return attachSecurityHeaders(blockedRes);
  }

  // 2. Strict API Security Controls
  if (pathname.startsWith('/api')) {
    // 2a. Require standard HTTP Methods
    const allowedMethods = ['GET', 'POST', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(request.method)) {
      const methodRes = NextResponse.json(
        { error: 'Method Not Allowed.' },
        { status: 405, headers: { Allow: 'GET, POST, OPTIONS, HEAD' } }
      );
      return attachSecurityHeaders(methodRes);
    }

    // 2b. Origin / Referer validation (CSRF friction — NOT authentication)
    //
    // The status code is 403, not 401. A 401 means "you are not authenticated
    // and could be if you presented a credential"; that is not what this check
    // does. `Origin` is a request header that any non-browser client sets to
    // whatever it likes, and curl sends none at all, so this blocks cross-site
    // requests from a page in someone's browser and stops nothing else. It is a
    // real control against CSRF and it is not a security boundary.
    //
    // The actual boundary on the telemetry write path is the per-station
    // pre-shared key checked in app/api/telemetry/route.ts via lib/auth.ts.
    // Do not relax this check expecting the write path to stay protected, and
    // do not treat passing it as evidence a caller is authorised.
    if (request.method === 'POST') {
      const origin = request.headers.get('origin') || request.headers.get('referer');
      if (!isOriginAllowed(origin)) {
        const crossOriginRes = NextResponse.json(
          {
            error: 'Cross-origin request blocked by Metshield CORS policy.',
            note:
              'This is CSRF friction, not authentication. A non-browser client can set this header.',
            authentication:
              'The telemetry write path separately requires a per-station credential — see POST /api/telemetry.',
          },
          { status: 403 }
        );
        return attachSecurityHeaders(crossOriginRes);
      }
    }
  }

  // Handle standard OPTIONS preflight requests for CORS
  if (request.method === 'OPTIONS') {
    const reqOrigin = request.headers.get('origin');
    // No wildcard. An unrecognised origin gets a bare 204 with no
    // Access-Control-Allow-Origin, so the browser refuses the actual request;
    // answering `*` told every page in every tab that the API was open to it.
    const allowOrigin = isOriginAllowed(reqOrigin) && reqOrigin ? reqOrigin : null;

    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Metshield-AI-Key',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;

    const preflightRes = new NextResponse(null, { status: 204, headers });
    return attachSecurityHeaders(preflightRes);
  }

  // 3. Fallthrough - Pass the request to the main application
  const response = NextResponse.next();
  attachSecurityHeaders(response);

  const region = request.headers.get('cf-ipcity') || request.headers.get('x-vercel-ip-city') || 'global';
  response.headers.set('X-Edge-Region', region);

  return response;
}

export const config = {
  // Apply middleware to all routes except static files, Next.js internal assets, and images
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, audio, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
