import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('ai', () => ({
  generateText: vi.fn().mockRejectedValue(new Error('Internal OpenAI sk-secret-leak trace')),
}));
import {
  consume,
  clientKey,
  resetRateLimits,
  getTrackedBucketCount,
} from '@/lib/rateLimit';
import { readJsonWithLimit } from '@/lib/requestBody';
import {
  enforceAiRequestLimits,
  MAX_AI_REQUESTS_PER_MINUTE,
  MAX_GLOBAL_PAID_AI_REQUESTS_PER_MINUTE,
} from '@/lib/aiLimits';
import { POST as telemetryPost, GET as telemetryGet } from '@/app/api/telemetry/route';
import { POST as assistantPost } from '@/app/api/assistant/route';
import { POST as copilotPost } from '@/app/api/ai/copilot/route';

describe('API Security Hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimits();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.METSHIELD_AI_ACCESS_KEY;
    delete process.env.TRUST_PROXY_HEADERS;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Rate-limit memory bounds & proxy-verified client addresses', () => {
    it('caps tracked buckets at maxKeys and fails closed when all buckets are active', () => {
      const cap = 5;
      for (let i = 0; i < cap; i++) {
        const res = consume(`key-${i}`, 10, 60_000, cap);
        expect(res.allowed).toBe(true);
      }
      expect(getTrackedBucketCount()).toBe(cap);

      // Unique-key flood beyond capacity must NOT grow the Map
      for (let i = 0; i < 20; i++) {
        const res = consume(`flood-${i}`, 10, 60_000, cap);
        expect(res.allowed).toBe(false);
        expect(res.remaining).toBe(0);
      }
      expect(getTrackedBucketCount()).toBe(cap);

      // Existing active caller still retains its counter
      const existing = consume('key-0', 10, 60_000, cap);
      expect(existing.allowed).toBe(true);
      expect(existing.remaining).toBe(8);
    });

    it('ignores spoofed X-Forwarded-For and X-Real-IP headers', () => {
      const spoofedA = new Headers({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '1.2.3.4' });
      const spoofedB = new Headers({ 'x-forwarded-for': '5.6.7.8', 'x-real-ip': '5.6.7.8' });

      expect(clientKey(spoofedA)).toBe('untrusted-client');
      expect(clientKey(spoofedB)).toBe('untrusted-client');
    });

    it('trusts platform-verified Vercel and Cloudflare client IP headers', () => {
      const vercelHeaders = new Headers({
        'x-vercel-forwarded-for': '203.0.113.10, 10.0.0.1',
        'x-forwarded-for': '198.51.100.99',
      });
      const cfHeaders = new Headers({
        'cf-connecting-ip': '203.0.113.20',
        'x-forwarded-for': '198.51.100.99',
      });

      expect(clientKey(vercelHeaders)).toBe('203.0.113.10');
      expect(clientKey(cfHeaders)).toBe('203.0.113.20');
    });

    it('rejects malformed stationId without creating per-station rate-limit buckets', async () => {
      const req = new NextRequest('http://localhost/api/telemetry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stationId: 'INVALID STATION ID!!', temperature: 25 }),
      });

      const res = await telemetryPost(req);
      expect(res.status).toBe(400);
      // Only the single IP bucket should exist, not a bucket for the invalid stationId
      expect(getTrackedBucketCount()).toBe(1);
    });
  });

  describe('2. Telemetry metadata protection & caching', () => {
    it('omits identifying device/GPS metadata and disables public caching on GET ?latest=true', async () => {
      const req = new NextRequest('http://localhost/api/telemetry?latest=true');
      const res = await telemetryGet(req);
      expect(res.status).toBe(200);

      const cacheControl = res.headers.get('cache-control') || '';
      expect(cacheControl).toContain('private');
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).not.toContain('public');
      expect(res.headers.get('cdn-cache-control')).toBeNull();

      const json = await res.json();
      expect(json.success).toBe(true);
      for (const pkt of json.packets) {
        expect(pkt).not.toHaveProperty('deviceName');
        expect(pkt).not.toHaveProperty('lat');
        expect(pkt).not.toHaveProperty('lon');
        expect(pkt).not.toHaveProperty('coordinates');
        expect(pkt).not.toHaveProperty('sensorSource');
        expect(pkt).not.toHaveProperty('securitySeal');
      }
    });
  });

  describe('3. Streaming request-body byte limits', () => {
    it('rejects oversized body with 413 when Content-Length is absent', async () => {
      const oversized = JSON.stringify({ data: 'x'.repeat(2000) });
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(oversized));
          controller.close();
        },
      });
      const req = new Request('http://localhost/api/telemetry', {
        method: 'POST',
        body: stream,
        // @ts-expect-error duplex required in node Request for ReadableStream
        duplex: 'half',
      });

      const result = await readJsonWithLimit(req, 512);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(413);
      }
    });

    it('rejects oversized body with 413 when Content-Length is spoofed smaller than actual body', async () => {
      const oversized = JSON.stringify({ data: 'y'.repeat(2000) });
      const req = new Request('http://localhost/api/telemetry', {
        method: 'POST',
        headers: { 'content-length': '10' },
        body: oversized,
      });

      const result = await readJsonWithLimit(req, 512);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(413);
      }
    });

    it('rejects with 413 when Content-Length exceeds limit', async () => {
      const req = new NextRequest('http://localhost/api/telemetry', {
        method: 'POST',
        headers: { 'content-length': '999999' },
        body: JSON.stringify({ stationId: 'AWS-DEL-04' }),
      });

      const res = await telemetryPost(req);
      expect(res.status).toBe(413);
    });
  });

  describe('4. Paid AI quotas & sanitized error responses', () => {
    it('enforces shared global AI quota across distinct client IPs when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test-dummy-key';

      for (let i = 0; i < MAX_GLOBAL_PAID_AI_REQUESTS_PER_MINUTE; i++) {
        const ip = `203.0.113.${Math.floor(i / MAX_AI_REQUESTS_PER_MINUTE) + 1}`;
        const denied = enforceAiRequestLimits(
          new Headers({ 'x-vercel-forwarded-for': ip }),
          'copilot'
        );
        expect(denied).toBeNull();
      }

      // Next request from a brand-new IP must still hit the shared global quota
      const blocked = enforceAiRequestLimits(
        new Headers({ 'x-vercel-forwarded-for': '203.0.113.250' }),
        'copilot'
      );
      expect(blocked).not.toBeNull();
      expect(blocked?.status).toBe(429);
    });

    it('returns sanitized 500 error without internal details when AI provider fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-dummy-key';
      process.env.METSHIELD_AI_ACCESS_KEY = 'super-secret-access-key';

      const req = new NextRequest('http://localhost/api/ai/copilot', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-metshield-ai-key': 'super-secret-access-key',
        },
        body: JSON.stringify({ prompt: 'Check station status' }),
      });

      const res = await copilotPost(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body).not.toHaveProperty('details');
      expect(JSON.stringify(body)).not.toContain('sk-secret-leak');
    });
  });

  describe('5. Legacy assistant endpoint hardening', () => {
    it('enforces body size limit and rate limit on /api/assistant', async () => {
      const oversizedReq = new Request('http://localhost/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ query: 'a'.repeat(10_000) }),
      });
      const oversizedRes = await assistantPost(oversizedReq);
      expect(oversizedRes.status).toBe(413);

      let lastStatus = 200;
      for (let i = 0; i < 25; i++) {
        const r = await assistantPost(
          new Request('http://localhost/api/assistant', {
            method: 'POST',
            body: JSON.stringify({ query: 'help' }),
          })
        );
        lastStatus = r.status;
      }
      expect(lastStatus).toBe(429);
    });
  });
});
