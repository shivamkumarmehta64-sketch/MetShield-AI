import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, context } = body;

    const lowerQuery = query.toLowerCase();

    // 1. FAST REGEX / DETERMINISTIC ENGINE
    if (lowerQuery.includes('broken') || lowerQuery.includes('sensor')) {
      return NextResponse.json({
        reply: `All physical probes are nominally locked and reporting inside WMO bounds. No broken sensors or ADC float locks detected right now.`,
      });
    }

    if (lowerQuery.includes('explain') || lowerQuery.includes('pressure change')) {
      return NextResponse.json({
        reply: `Safdarjung's pressure is stable. If it drops >2.5 hPa while humidity surges >15%, I classify it as a convective storm. Otherwise, it's quarantined as hardware drift.`,
      });
    }

    if (lowerQuery.includes('download') || lowerQuery.includes('audit')) {
      return NextResponse.json({
        reply: `Click the "Export QC Audit Log (.csv)" button in the diagnostic drawer. It downloads standard WMO-compliant headers formatted for direct NABL calibration pipelines.`,
      });
    }

    if (lowerQuery.includes('imputation') || lowerQuery.includes('heal')) {
      return NextResponse.json({
        reply: `IMPUTATION LOGIC: When Tier 1/2 QC detects an anomaly, a windowed mean over the observation window activates to calculate a replacement value, drawing a dashed line to prevent downstream forecast crashes. This is a flat trailing mean, not a Gaussian weighted moving average.`,
      });
    }

    // 2. FALLBACK MOCK LLM (For presentation safety without external API dependencies)
    // Note: In production, this would call `await fetch('https://generativelanguage.googleapis.com/...', { ... })`
    const mockResponses = [
      `As JATAYU-Sahayak, I analyze telemetry based strictly on WMO-No. 8 standards. The station ${context?.station} is maintaining stable transmission.`,
      `Currently observing Temp: ${context?.telemetry?.temp}°C, Pres: ${context?.telemetry?.press}hPa. No severe atmospheric anomalies or probe float locks detected at this moment.`,
      `My primary directive is to protect the meteorological grid from corrupted inputs. Ensure 72-hour FIFO edge buffering is active if network drops are anticipated.`,
    ];
    
    // Pick a deterministic response based on query length to fake dynamic generation
    const fallbackReply = mockResponses[query.length % mockResponses.length];

    return NextResponse.json({
      reply: fallbackReply,
    });
  } catch  {
    return NextResponse.json({ reply: 'An error occurred while processing your query. Please check your telemetry feed.' }, { status: 500 });
  }
}
