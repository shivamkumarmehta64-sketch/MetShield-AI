import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';

  let hostname = 'localhost';
  let port = protocol === 'https' ? 443 : 80;

  try {
    const dummyUrl = new URL(`${protocol}://${host}`);
    hostname = dummyUrl.hostname;
    port = dummyUrl.port ? Number(dummyUrl.port) : (protocol === 'https' ? 443 : 80);
  } catch {
    hostname = host.split(':')[0] || 'localhost';
  }

  const mobileLanUrl = `${protocol}://${host}/mobile`;

  return NextResponse.json({
    success: true,
    lanIp: hostname,
    allIps: [hostname],
    port,
    mobileLanUrl,
    serverTime: new Date().toISOString(),
  });
}
