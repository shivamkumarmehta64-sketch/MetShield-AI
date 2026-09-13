import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Metshield AI Copilot: Natural Language Weather QMS Assistant
 * Powered by Vercel AI SDK + OpenAI gpt-4o-mini (free tier)
 * Falls back to rule-based responses if no OPENAI_API_KEY configured
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid prompt parameter' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    if (!hasOpenAIKey) {
      // Fallback: Rule-based responses for common queries (no API key needed)
      const fallbackResponse = generateFallbackResponse(prompt);
      return NextResponse.json({
        success: true,
        result: fallbackResponse,
        timestamp: Date.now(),
        model: 'rule-based-fallback',
        provider: 'Metshield AI Local Engine (No API Key Required)',
      });
    }

    const systemPrompt = `You are Metshield AI Copilot, an expert assistant for Automated Weather Station Quality Management Systems (AWS-QMS).

Your expertise includes:
- WMO Pub No. 8 quality control standards
- Telemetry anomaly detection and sensor diagnostics
- Severe weather pattern recognition (convective storms, heatwaves)
- Sensor health monitoring and predictive maintenance
- Spatial cross-validation using neighboring station data
- HMAC-SHA256 data provenance and cryptographic seals
- Edge computing and sub-5ms latency optimization

Respond concisely (3-4 sentences) with technical accuracy for weather station operators and meteorologists.`;

    // Use Vercel AI SDK with OpenAI
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 200,
      temperature: 0.8,
    });

    return NextResponse.json({
      success: true,
      result: text,
      timestamp: Date.now(),
      model: 'gpt-4o-mini',
      provider: 'Vercel AI SDK + OpenAI',
      compliance: 'WMO Pub No. 8 Standards',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'AI copilot query failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

function generateFallbackResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('anomaly') || lowerPrompt.includes('fault')) {
    return 'Metshield AI uses WMO Pub 8 quality control rules to detect telemetry anomalies. The 5-tier pipeline validates bounds, rate-of-change, spatial consistency, and sensor health. Suspect readings are automatically quarantined and flagged for technician review.';
  }

  if (lowerPrompt.includes('storm') || lowerPrompt.includes('weather')) {
    return 'The Storm vs Fault Discriminator uses thermodynamic physics: severe convective storms show ΔP ≤ -2.5 hPa, ΔRH ≥ +15%, ΔT ≤ -1.5°C in <10 minutes. Sensor faults display open-circuit spikes or stuck ADC registers. Sub-5ms classification ensures real-time NWP model ingestion.';
  }

  if (lowerPrompt.includes('sensor') || lowerPrompt.includes('health')) {
    return 'Sensor Health Index (SHI) is calculated from drift velocity, persistence metrics, and spatial neighbor consensus. Values <70% trigger predictive maintenance alerts. The system forecasts sensor failure 48-72 hours before complete blackout.';
  }

  if (lowerPrompt.includes('wmo') || lowerPrompt.includes('quality')) {
    return 'WMO Pub No. 8 defines 5-tier quality control: Tier 1 validates physical bounds, Tier 2 checks rate-of-change limits, Tier 3 runs persistence analysis, Tier 4 performs spatial cross-validation, Tier 5 applies climatological checks. Metshield AI implements all tiers with <5ms latency.';
  }

  return 'Metshield AI provides 24x7 automated weather station quality management with WMO Pub 8 compliance. The system runs real-time anomaly detection, predictive maintenance, and severe weather classification. All telemetry is cryptographically sealed with HMAC-SHA256 for tamper-proof provenance.';
}

