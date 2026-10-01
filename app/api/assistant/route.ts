import { NextResponse } from 'next/server';

// Node.js runtime, not 'edge'. The edge runtime is deprecated in Next.js 16,
// and this route used no edge-only API, so the switch is behaviourally inert.
//
// CLASSIFICATION: legacy / unrouted. This endpoint is reachable, but nothing
// in the repository renders a caller — `components/JatayuAssistant.tsx` is
// exported and never mounted, and it is the only consumer. It is NOT wired to
// the dashboard, it is NOT rate limited, and there is no LLM anywhere in this
// path. The previous build answered with static strings that asserted live
// meteorological conditions ("Safdarjung's pressure is stable", "Currently
// observing Temp: …°C"). Those were fabricated readings, not measurements, and
// this repository must not emit a confident observation it did not take.
//
// What it returns now is a fixed, clearly-labelled set of help text. It reads no
// engine state and makes no claim about any station's current condition.
const HELP_TOPICS: { match: RegExp; reply: string }[] = [
  {
    match: /\b(broken|damaged)\b|sensor/,
    reply:
      'HOW SENSOR FAULTS ARE CLASSIFIED (static help text — not a reading of any station): ' +
      'an isolated step with no thermodynamic coupling is quarantined as FLAG_4_CORRUPT_HARDWARE / SENSOR_SPIKE. ' +
      'To see what the engine actually concluded for a given station, open its entry in the station registry rather than asking here.',
  },
  {
    match: /\bexplain\b|pressure change/,
    reply:
      'HOW STORM DISCRIMINATION WORKS (static help text — not a reading of any station): ' +
      'a convective storm requires a coupled signature — a pressure drop beyond the tier threshold together with a humidity rise and a temperature fall. ' +
      'A large pressure step with no humidity coupling is treated as hardware drift instead. ' +
      'The engine applies this per packet; the QC workspace shows the result.',
  },
  {
    match: /\b(download|export|audit)\b/,
    reply:
      'HOW TO EXPORT (static help text): the station matrix on the dashboard has a CSV button that exports the rows currently on screen, ' +
      'including each station’s registry fields, its WMO flag and its root-cause classification. ' +
      'The audit report page describes what the per-packet digest is, and what it is not.',
  },
  {
    match: /\b(imput|heal|missing|null)\b/,
    reply:
      'HOW IMPUTATION WORKS (static help text): when a channel is null the engine substitutes a value from a weighted window over recent observations, ' +
      'so downstream consumers are not handed a null. The imputed value is always distinguishable from the observed one in the console. ' +
      'This is a windowed mean, not a trained model.',
  },
  {
    match: /\b(who|what) are you\b|\bjatayu\b|\bmetshield\b|help/,
    reply:
      'This endpoint is a legacy stub. It performs no inference, consults no model and reports no measurements. ' +
      'The engine-backed features are the dashboard, the QC workspace and the testbench.',
  },
];

const FALLBACK =
  'This endpoint does not answer questions about the network — it is a legacy stub with no engine access. ' +
  'For QC results, open the station registry or the QC workspace, both of which read the engine directly.';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query : '';

    const hit = HELP_TOPICS.find((t) => t.match.test(query.toLowerCase()));

    return NextResponse.json({ reply: hit ? hit.reply : FALLBACK, grounded: false });
  } catch {
    return NextResponse.json(
      { reply: 'Could not read that request.', grounded: false },
      { status: 400 }
    );
  }
}
