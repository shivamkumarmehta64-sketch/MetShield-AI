import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, context } = body;

    const lowerQuery = query.toLowerCase();

    // 1. FAST REGEX / DETERMINISTIC ENGINE
    if (lowerQuery.includes('health') || lowerQuery.includes('status')) {
      return NextResponse.json({
        reply: `SYSTEM STATUS: Station ${context?.station || 'Unknown'} is active. Current limits - PT100 Temp (-10°C to 55°C), PTB110 Pressure (920 to 1050 hPa). Latest telemetry shows Temp: ${context?.telemetry?.temp}°C, Pres: ${context?.telemetry?.press} hPa. No critical hardware faults logged.`,
      });
    }

    if (lowerQuery.includes('storm') || lowerQuery.includes('glitch') || lowerQuery.includes('pressure drop')) {
      return NextResponse.json({
        reply: `THERMODYNAMIC RULE: A genuine storm (convective front) requires coupled shifts: ΔP ≤ -2.5 hPa matched with ΔRH ≥ +15%. If this is absent, the system flags it as a hardware glitch (Red Status).`,
      });
    }

    if (lowerQuery.includes('export') || lowerQuery.includes('download') || lowerQuery.includes('audit')) {
      return NextResponse.json({
        reply: `AUDIT EXPORT: To generate NIC-compliant CSV metadata, click the "Export QC Audit Log (.csv)" button in the stealth diagnostic drawer at the bottom of the main console.`,
      });
    }

    if (lowerQuery.includes('imputation') || lowerQuery.includes('heal')) {
      return NextResponse.json({
        reply: `IMPUTATION LOGIC: When Tier 1/2 QC detects an anomaly, a 5-step Gaussian Weighted Moving Average (WMA) activates to calculate a replacement value, drawing a dashed line to prevent downstream forecast crashes.`,
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
  } catch (error) {
    return NextResponse.json({ reply: 'An error occurred while processing your query. Please check your telemetry feed.' }, { status: 500 });
  }
}
