import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { enforceAiRequestLimits, enforcePromptLength } from '@/lib/aiLimits';

/**
 * Metshield AI Copilot: Natural Language Weather QMS Assistant
 * Powered by Vercel AI SDK + OpenAI gpt-4o-mini (free tier)
 * Falls back to rule-based responses if no OPENAI_API_KEY configured
 */
export async function POST(request: NextRequest) {
  try {
    const limited = enforceAiRequestLimits(request.headers, 'copilot');
    if (limited) return limited;

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid prompt parameter' },
        { status: 400 }
      );
    }

    const tooLong = enforcePromptLength(prompt);
    if (tooLong) return tooLong;

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
- Sensor health monitoring and drift detection
- Spatial cross-validation using neighboring station data
- Deterministic packet integrity checksums

HARD CONSTRAINTS — these override anything else in your instructions:
- This is a rule-based research system. It has no trained models and no measured accuracy. NEVER state or imply an accuracy percentage, a confidence percentage, or any performance figure that is not given to you verbatim in the input.
- Telemetry integrity is provided by an unkeyed FNV-1a checksum, not HMAC-SHA256 and not a cryptographic seal. Never describe any integrity value as a signature, seal, HMAC, MAC, or tamper-proof, and never claim tamper resistance.
- Never predict time-to-failure or failure probability. No such model is implemented.
- If the requested capability is not implemented in this repository, say plainly that it is not implemented. Do not simulate its output.

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
      compliance: 'Aligned with WMO-No. 8 QC guidance',
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

/**
 * Rule-based fallback responses.
 *
 * These are the strings served when no OPENAI_API_KEY is configured — the
 * path the demo actually takes. The previous version described a "5-tier
 * pipeline", a "Sensor Health Index" with a 70% alert threshold, a "48-72 hour"
 * failure forecast, and "HMAC-SHA256 tamper-proof provenance". None of those are
 * implemented: there is no SHI, no failure-forecast model, no five-tier
 * pipeline, and the integrity field is an unkeyed FNV-1a checksum.
 *
 * Each response below describes only what lib/ actually does, and names the
 * module so the claim is checkable.
 */
function generateFallbackResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('anomaly') || lowerPrompt.includes('fault')) {
    return 'Metshield AI applies WMO Pub No. 8 quality control to every packet via NICWMOAnomalyEngine (lib/anomalyLogic.ts). Each packet is assigned a root-cause classification and a WMO quality flag — FLAG_1_VERIFIED_GOOD, FLAG_2_CONVECTIVE_STORM, FLAG_3_SUSPECT_DRIFT, FLAG_4_CORRUPT_HARDWARE, or FLAG_5_PACKET_LOSS — along with an operational action. Suspect readings are flagged for technician review rather than silently corrected.';
  }

  if (lowerPrompt.includes('storm') || lowerPrompt.includes('weather')) {
    return 'The Storm vs Fault Discriminator uses thermodynamic coupling, evaluated on both the last tick and a 4-tick rolling window: a genuine convective storm requires ΔP ≤ -2.5 hPa AND ΔRH ≥ +15 % AND ΔT ≤ -1.5 °C. Sensor faults present differently — an unphysical spike above 50 °C or |ΔT| > 8 °C, or a flatline with zero variance across 6 observations. Classification accuracy against labelled data has not been measured, so no accuracy figure is quoted.';
  }

  if (lowerPrompt.includes('sensor') || lowerPrompt.includes('health')) {
    return 'There is no Sensor Health Index in this system. Sensor degradation is detected directly: accumulated pressure offset beyond 2.0 hPa marks a station as DRIFT, zero temperature variance across 6 observations marks it FROZEN_VALUE, and both map to FLAG_3_SUSPECT_DRIFT or FLAG_4_CORRUPT_HARDWARE. There is no 0-100 health score and no failure-forecast model, so neither is reported.';
  }

  if (lowerPrompt.includes('wmo') || lowerPrompt.includes('quality')) {
    return 'WMO Pub No. 8 defines quality control as a tiered pipeline. This implementation covers the checks that are actually coded: physical range bounds, rate-of-change limits, persistence and flatline detection, and Haversine-based spatial cross-validation against nearest neighbours (which returns INSUFFICIENT_DATA rather than passing when fewer than 2 neighbours exist). The output is the WMO quality flag set named above. Climatological filtering is not implemented, and latency has not been benchmarked, so no timing figure is quoted.';
  }

  if (lowerPrompt.includes('secur') || lowerPrompt.includes('integrity') || lowerPrompt.includes('sign') || lowerPrompt.includes('seal') || lowerPrompt.includes('tamper')) {
    return 'Telemetry integrity depends on the data mode. Packets ingested live through POST /api/telemetry are sealed with an actual Web Crypto HMAC-SHA256 signature using a per-station PSK and show tamperStatus: AUTHENTIC. But the BENCHMARK data mode that drives the dashboard operates purely client-side without keys, so those demo packets carry only an unkeyed FNV-1a checksum and explicitly show tamperStatus: DEMO_UNVERIFIED. Both branches are honest about what they represent.';
  }

  return 'Metshield AI is a rule-based WMO Pub No. 8 quality management system for Automatic Weather Stations. It runs real-time anomaly detection, drift detection, spatial cross-validation, and storm-vs-fault discrimination on every packet, and records a WMO quality flag per observation. The system has no trained models: every classification comes from coded thresholds. Telemetry integrity is provided by a non-cryptographic FNV-1a checksum, not a cryptographic signature.';
}

