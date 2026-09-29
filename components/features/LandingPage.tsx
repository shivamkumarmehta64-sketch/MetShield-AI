'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { DISTRICT_REGISTRY_COUNTS, DISTRICT_REGISTRY_STATEMENT } from '@/lib/dataProvenance';
import { DATA_MODE } from '@/lib/networkFeed';
import OperationsBand from '@/components/landing/OperationsBand';
import QcPipelineBand from '@/components/landing/QcPipelineBand';
import StationTableBand from '@/components/landing/StationTableBand';
import ProvenanceBand from '@/components/landing/ProvenanceBand';

/**
 * The public page.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * The previous version of this file set `data-theme="dark"` on its root and
 * then hardcoded #0A0A0A / #141414 / #1E1E1E / #C0162C inline at roughly forty
 * call sites. That bypassed the design tokens in app/globals.css entirely and
 * re-introduced, on the front page, the exact brand red that globals.css had
 * retired so that red would mean "critical fault and nothing else". It also
 * carried a set of claims the code does not support. All of it is gone.
 *
 * The dark terminal that sat in the hero is also gone, and that is a deletion
 * rather than a restyle. It appended lines like
 *
 *     [174829] RECV: NODE_1042  T:27.44C  P:1006.2hPa  -> ACQUIRED
 *
 * every 400 ms from Math.random(), under a pulsing dot labelled LIVE. No
 * packet was received; nothing was acquired. A judge who scrolls for ten
 * seconds finds that in the first screen, and having found it, discounts
 * every other number on the page. Removing it costs the page its most
 * eye-catching element and buys back the page's credibility.
 *
 * WHAT IS LEFT
 * ------------
 * A rail of sections beside the operations band, which is the console's own
 * data rather than a picture of it. Everything numeric on this page is read
 * from lib/ at render time.
 */

/** The rail is navigation, not decoration: these are sections a reader walks. */
const SECTIONS = [
  { id: 'platform', label: 'Platform' },
  { id: 'qc-engine', label: 'QC engine' },
  { id: 'network', label: 'Network' },
  { id: 'provenance', label: 'Provenance' },
] as const;

const NAV = [
  { href: '#platform', label: 'Platform' },
  { href: '#qc-engine', label: 'QC engine' },
  { href: '#network', label: 'Network' },
  { href: '#provenance', label: 'Provenance' },
  { href: '/audit-report', label: 'Documentation' },
];

function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState<string>(ids[0]);

  useEffect(() => {
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The active section is the topmost one currently intersecting the
        // viewport. Picking the last entry in document order rather than
        // whichever fired last stops the rail flickering between two
        // sections that are both partly on screen.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-88px 0px -55% 0px', threshold: 0 }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export default function LandingPage() {
  const sectionIds = SECTIONS.map((s) => s.id);
  const active = useActiveSection(sectionIds);

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--page)', color: 'var(--ink)' }}>
      {/* ─── Header ────────────────────────────────────────────────────────
          Nav is sentence case and 13px. It is a wayfinding strip for a
          technical reader, not a brand banner. */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--hairline)' }}
      >
        <div className="mx-auto flex items-center justify-between gap-4" style={{ maxWidth: 1500, padding: '0 20px', height: 54 }}>
          <div className="flex items-baseline gap-2.5">
            <span style={{ width: 9, height: 9, background: 'var(--brand)', display: 'inline-block' }} aria-hidden />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>MetShield AI</span>
            <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
              AWS quality management
            </span>
          </div>

          <nav aria-label="Sections" className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="t-body"
                style={{ color: 'var(--ink-muted)', textDecoration: 'none', padding: '6px 9px', fontSize: 13 }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: '7px 14px',
                background: 'var(--brand)',
                color: 'var(--accent-fg)',
                textDecoration: 'none',
                borderRadius: 4,
                marginLeft: 6,
                display: 'inline-block',
              }}
            >
              Open live console
            </Link>
          </nav>

          <Link
            href="/dashboard"
            className="t-body md:hidden"
            style={{
              fontWeight: 600,
              padding: '7px 12px',
              background: 'var(--brand)',
              color: 'var(--accent-fg)',
              textDecoration: 'none',
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            Console
          </Link>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full" style={{ maxWidth: 1500, padding: '0 20px' }}>
        {/* ─── Rail + operations band ───────────────────────────────────────
            The rail is sticky and the band sits beside it for the whole
            height of the page. On a laptop this reads as one wide console
            with a contents list; scrolling moves the left column of sections,
            never the panel. */}
        <div className="grid grid-cols-1 lg:grid-cols-[188px_1fr] gap-x-8" style={{ paddingTop: 22, paddingBottom: 40 }}>
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky" style={{ top: 76 }}>
              <h2 className="t-label" style={{ marginBottom: 8 }}>On this page</h2>
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="land-rail-link"
                  aria-current={active === s.id ? 'true' : undefined}
                >
                  <span className="land-rail-num">{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </a>
              ))}

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
                <div className="t-label" style={{ marginBottom: 5 }}>Data mode</div>
                <div className="t-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{DATA_MODE}</div>
                <p className="t-meta" style={{ marginTop: 5, fontSize: 11 }}>
                  Nothing in this build is live. See{' '}
                  <a href="#provenance" style={{ color: 'var(--color-telemetry-text)' }}>provenance</a>.
                </p>
              </div>
            </div>
          </nav>

          <main className="flex flex-col" style={{ gap: 44, minWidth: 0 }}>
            {/* ── 01 Platform ── */}
            <section id="platform" className="land-anchor" aria-labelledby="platform-h">
              <div style={{ maxWidth: '76ch' }}>
                <h1 id="platform-h" className="t-page-title">
                  Automatic weather station quality control, decided by rules you can read.
                </h1>
                <p className="t-body" style={{ marginTop: 12, color: 'var(--ink-muted)', fontSize: 15.5, lineHeight: 1.6 }}>
                  MetShield is a quality management system for India&apos;s automatic weather station network. It takes
                  each observation, decides whether the atmosphere changed or a sensor did, and either passes the reading
                  to the numerical weather prediction stream or raises a work order against a named station.
                </p>
                <p className="t-body" style={{ marginTop: 10, color: 'var(--ink-muted)' }}>
                  The decision is a deterministic threshold cascade — WMO Pub No. 8 quality flags, no trained model, no
                  inference service. Every threshold is stated in the code and reproduced on this page.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2" style={{ marginTop: 16 }}>
                <Link
                  href="/dashboard"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '8px 16px',
                    background: 'var(--brand)',
                    color: 'var(--accent-fg)',
                    textDecoration: 'none',
                    borderRadius: 4,
                  }}
                >
                  Open live console
                </Link>
                <Link href="/stations" className="t-body" style={{ color: 'var(--color-telemetry-text)' }}>
                  Station registry
                </Link>
                <span className="t-meta">
                  {IMD_AWS_STATIONS.length} station profiles in this build ·{' '}
                  {DISTRICT_REGISTRY_COUNTS.total} districts in the registry
                </span>
              </div>

              <p className="t-meta" style={{ marginTop: 10, maxWidth: '76ch' }}>
                {DISTRICT_REGISTRY_STATEMENT}
              </p>
            </section>

            {/* ── The operations band. This is the page. ── */}
            <section aria-label="Network operations">
              <OperationsBand />
            </section>

            {/* ── 02 QC engine ── */}
            <section id="qc-engine" className="land-anchor" aria-labelledby="qc-h">
              <div style={{ maxWidth: '76ch', marginBottom: 16 }}>
                <h2 id="qc-h" className="t-section-title">
                  How MetShield QC decides
                </h2>
                <p className="t-body" style={{ marginTop: 7, color: 'var(--ink-muted)' }}>
                  The central problem in station quality management is telling a broken instrument apart from real
                  weather. Discarding a cyclone because the barometer looked odd loses the event; accepting a failed
                  thermistor poisons the assimilation stream. The chain below is how the engine separates them, and what
                  each stage actually tests.
                </p>
              </div>
              <QcPipelineBand />
            </section>

            {/* ── 03 Network ── */}
            <section id="network" className="land-anchor" aria-labelledby="network-h">
              <div style={{ maxWidth: '76ch', marginBottom: 16 }}>
                <h2 id="network-h" className="t-section-title">
                  The network
                </h2>
                <p className="t-body" style={{ marginTop: 7, color: 'var(--ink-muted)' }}>
                  Every registered station, its newest observation, and the QC decision the engine reached on it. Rows
                  that are not nominal sort to the top — the table is a working list, not a gallery.
                </p>
              </div>
              <StationTableBand />
            </section>

            {/* ── 04 Provenance ── */}
            <section id="provenance" className="land-anchor" aria-labelledby="prov-h">
              <div style={{ maxWidth: '76ch', marginBottom: 16 }}>
                <h2 id="prov-h" className="t-section-title">
                  What is real, and what is not
                </h2>
                <p className="t-body" style={{ marginTop: 7, color: 'var(--ink-muted)' }}>
                  A number that looks official but was generated is worse than an obvious placeholder, because a reviewer
                  cannot tell which is which. Every source in this build is listed below with the label it carries. Nothing
                  on this page is a live measurement.
                </p>
              </div>
              <ProvenanceBand />
            </section>
          </main>
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────────
          The old footer badge read "WMO PUB 8 COMPLIANT". Compliance is an
          audit outcome, not a marketing line, and nothing in this repository
          has been through one. The footer now says what the project is. */}
      <footer style={{ borderTop: '1px solid var(--hairline)', background: 'var(--card)', marginTop: 'auto' }}>
        <div
          className="mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
          style={{ maxWidth: 1500, padding: '16px 20px' }}
        >
          <p className="t-meta">
            MetShield AI · Team AEROTECH · SIH 2026 problem SIH26073 · Ministry of Earth Sciences / IMD
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/dashboard" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Console</Link>
            <Link href="/stations" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Network</Link>
            <Link href="/incidents" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Incidents</Link>
            <Link href="/audit-report" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Audit report</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
