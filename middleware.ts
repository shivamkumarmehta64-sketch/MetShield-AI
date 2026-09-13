import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Known malicious user agents and automated vulnerability scanners
const BLOCKED_USER_AGENTS = [
  'python-requests',
  'postmanruntime',
  'go-http-client',
  'java',
  'nmap',
  'sqlmap',
  'nikto',
  'masscan',
  'zgrab',
];

// Helper to check whether an origin is permitted
function isOriginAllowed(originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    const parsed = new URL(originHeader);
    const host = parsed.hostname;

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

    // Allow trusted production & preview domains
    if (
      host === 'metshield-ai.vercel.app' ||
      host.endsWith('.vercel.app') ||
      host === 'jatayu-qms.vercel.app' ||
      host.endsWith('.pages.dev')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// Default baseline defensive security headers
function attachSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Metshield-Edge-Secured', 'true');
  return response;
}

export function middleware(request: NextRequest) {
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

    // 2b. Strict Origin / Referer Validation (CORS enforcement)
    // Applied on POST mutations to protect against CSRF and cross-origin abuse
    if (request.method === 'POST') {
      const origin = request.headers.get('origin') || request.headers.get('referer');
      if (!isOriginAllowed(origin)) {
        const unauthRes = NextResponse.json(
          { error: 'Unauthorized Cross-Origin Request. Blocked by Metshield CORS Policy.' },
          { status: 401 }
        );
        return attachSecurityHeaders(unauthRes);
      }
    }
  }

  // Handle standard OPTIONS preflight requests for CORS
  if (request.method === 'OPTIONS') {
    const reqOrigin = request.headers.get('origin');
    const allowOrigin = isOriginAllowed(reqOrigin) && reqOrigin ? reqOrigin : '*';

    const preflightRes = new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
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
