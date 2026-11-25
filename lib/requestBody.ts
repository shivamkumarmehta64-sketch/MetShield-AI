import { NextResponse } from 'next/server';

export type ReadJsonResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function payloadTooLargeResponse(maxBytes: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `Payload Too Large. Maximum allowed size is ${maxBytes} bytes.`,
    },
    { status: 413 }
  );
}

function invalidJsonResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Invalid JSON payload structure.',
    },
    { status: 400 }
  );
}

/**
 * Read and parse a JSON request body while enforcing a strict byte limit.
 *
 * Unlike checking `Content-Length` alone, this streams the body and aborts
 * with 413 as soon as cumulative bytes exceed `maxBytes`, defending against
 * missing or spoofed `Content-Length` headers.
 */
export async function readJsonWithLimit<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number
): Promise<ReadJsonResult<T>> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, response: payloadTooLargeResponse(maxBytes) };
    }
  }

  let rawText = '';

  if (request.body) {
    const reader = request.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => {});
            return { ok: false, response: payloadTooLargeResponse(maxBytes) };
          }
          rawText += decoder.decode(value, { stream: true });
        }
      }
      rawText += decoder.decode();
    } catch {
      return { ok: false, response: invalidJsonResponse() };
    }
  } else {
    try {
      rawText = await request.text();
      if (Buffer.byteLength(rawText, 'utf8') > maxBytes) {
        return { ok: false, response: payloadTooLargeResponse(maxBytes) };
      }
    } catch {
      return { ok: false, response: invalidJsonResponse() };
    }
  }

  if (!rawText.trim()) {
    return { ok: false, response: invalidJsonResponse() };
  }

  try {
    const parsed = JSON.parse(rawText) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, response: invalidJsonResponse() };
  }
}
