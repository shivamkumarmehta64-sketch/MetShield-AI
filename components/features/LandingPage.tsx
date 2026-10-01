'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';
import { DATA_MODE } from '@/lib/networkFeed';
import QcPipelineBand from '@/components/landing/QcPipelineBand';
import EngineRuleInspector from '@/components/landing/EngineRuleInspector';
import StationTableBand from '@/components/landing/StationTableBand';
import ProvenanceBand from '@/components/landing/ProvenanceBand';
import HeroVisual from '@/components/landing/HeroVisual';
import NetworkSnapshotBand from '@/components/landing/NetworkSnapshotBand';
import WhatChangedBand from '@/components/landing/WhatChangedBand';
import HowMetshieldDecidesBand from '@/components/landing/HowMetshieldDecidesBand';

/**
 * The public landing page for MetShield AI.
 * 
 * Strict adherence to:
 * - Weather-native adaptive UI (light operations console, calm background, semantic colors)
 * - Benchmark honesty: "Nothing in this build is live" / BENCHMARK DATA MODE
 * - Immediate answer to: "Did the atmosphere change — or did the sensor?"
 * - WHAT -> WHERE -> WHY -> ACTION hierarchy.
 */

const SECTIONS = [
  { id: 'platform', label: 'Platform' },
  { id: 'what-changed', label: 'What changed?' },
  { id: 'qc-engine', label: 'QC engine' },
  { id: 'network', label: 'Network' },
  { id: 'provenance', label: 'Provenance' },
] as const;

const NAV = [
  { href: '#platform', label: 'Platform' },
  { href: '#what-changed', label: 'What changed?' },
  { href: '#qc-engine', label: 'QC engine' },
  { href: '#network', label: 'Network' },
  { href: '#provenance', label: 'Provenance' },
  { href: '/mobile', label: 'Mobile PWA' },
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
      {/* ─── Tricolor Institutional Bar ──────────────────────────────────── */}
      <div className="flex w-full h-[2.5px] shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-y border-hairline/40" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ─── Institutional Header ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-card border-b border-hairline shadow-xs"
      >
        <div className="mx-auto flex items-center justify-between gap-4" style={{ maxWidth: 1500, padding: '0 20px', height: 56 }}>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-xs bg-navy" aria-hidden />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold tracking-tight text-navy">METSHIELD AI</span>
                <span className="t-label hidden sm:inline-block px-1.5 py-0.5 rounded bg-surface-alt border border-hairline text-ink-muted text-[10px]">
                  NAWS-QMS v4.2
                </span>
              </div>
              <div className="text-[11px] text-ink-muted font-mono hidden md:block">
                भारत सरकार | Ministry of Earth Sciences
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 border-l border-hairline pl-4 ml-2">
            <span className="flex items-center gap-1.5 t-meta text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-live-dot"></span>
              2.5s DCP link
            </span>
            <div className="flex items-center gap-1 bg-surface-alt rounded border border-hairline px-1">
              <button className="px-1.5 text-xs hover:text-navy text-ink-muted font-bold">A-</button>
              <button className="px-1.5 text-[13px] hover:text-navy text-ink-muted font-bold">A</button>
              <button className="px-1.5 text-sm hover:text-navy text-ink-muted font-bold">A+</button>
            </div>
            <button className="t-meta text-[11px] font-semibold border border-hairline rounded px-2 hover:bg-surface-hover">
              हिन्दी
            </button>
          </div>

          <nav aria-label="Sections" className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="t-body text-ink-muted hover:text-navy hover:bg-surface-hover transition-colors rounded px-2.5 py-1.5 text-[13px]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <span className="t-label font-mono px-2 py-1 rounded border border-hairline bg-surface-alt text-ink font-semibold text-[11px]">
              {DATA_MODE}
            </span>
            <Link
              href="/dashboard"
              className="text-[12.5px] font-semibold px-3.5 py-1.5 bg-navy text-white hover:bg-navy-deep transition-colors rounded shadow-xs"
            >
              Open console
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full" style={{ maxWidth: 1500, padding: '0 20px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[196px_1fr] gap-x-8" style={{ paddingTop: 24, paddingBottom: 48 }}>
          {/* Navigation Rail */}
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky" style={{ top: 80 }}>
              <h2 className="t-label" style={{ marginBottom: 10 }}>On this page</h2>
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

              <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                <div className="t-label" style={{ marginBottom: 5 }}>Data mode</div>
                <div className="t-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{DATA_MODE}</div>
                <p className="t-meta" style={{ marginTop: 5, fontSize: 11 }}>
                  Nothing in this build is live. See{' '}
                  <a href="#provenance" style={{ color: 'var(--color-telemetry-text)' }}>provenance</a>.
                </p>
              </div>
            </div>
          </nav>

          {/* Main Content Stream */}
          <main className="flex flex-col" style={{ gap: 40, minWidth: 0 }}>
            {/* ── 01 Platform Hero ── */}
            <section id="platform" className="land-anchor space-y-6" aria-labelledby="platform-h">
              <div style={{ maxWidth: '82ch' }}>
                <div className="t-label text-sky-deep font-bold tracking-wider mb-2">
                  AUTOMATIC WEATHER STATION QUALITY CONTROL
                </div>
                <h1 id="platform-h" className="t-page-title text-navy font-bold leading-tight">
                  Know whether the atmosphere changed — or the sensor did.
                </h1>
                <p className="t-body mt-3 text-ink-muted text-[15.5px] leading-relaxed">
                  MetShield evaluates AWS observations using meteorological quality-control rules and produces explainable decisions for operators.
                  It discriminates genuine convective squalls from hardware transducer faults before observations reach NWP assimilation streams.
                </p>
                <p className="t-body mt-2 text-ink-muted text-[13.5px]">
                  The decision engine is a deterministic threshold cascade aligned with applicable WMO-No. 8 guidance — zero black-box delay, zero unverified models. Every threshold is stated in code and verifiable by audit.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="text-[13px] font-semibold px-4 py-2 bg-navy text-white hover:bg-navy-deep transition-colors rounded shadow-xs"
                >
                  Open operations console
                </Link>
                <Link
                  href="/mobile"
                  className="text-[13px] font-semibold px-3.5 py-2 border border-sky-deep/40 text-sky-deep bg-sky-50/50 hover:bg-sky-50 transition-colors rounded shadow-xs flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-healthy animate-pulse" />
                  Mobile Sensor PWA
                </Link>
                <a
                  href="#qc-engine"
                  className="text-[13px] font-semibold px-4 py-2 border border-hairline-strong text-navy bg-card hover:bg-surface-hover transition-colors rounded shadow-xs"
                >
                  Explore QC engine
                </a>
                <Link href="/stations" className="t-body ml-2 text-sky-deep hover:underline text-[13px]">
                  Station registry ({IMD_AWS_STATIONS.length} stations · {DISTRICT_REGISTRY_COUNTS.total} districts)
                </Link>
              </div>

              {/* Scientific Hero Visual */}
              <HeroVisual />

              {/* Network Snapshot Strip */}
              <NetworkSnapshotBand />
            </section>

            {/* ── Signature Section: "What Changed?" ── */}
            <section id="what-changed" className="land-anchor space-y-4" aria-labelledby="what-changed-h">
              <div style={{ maxWidth: '78ch' }}>
                <div className="t-label text-sky-deep font-bold mb-1">SIGNATURE DISCRIMINATION</div>
                <h2 id="what-changed-h" className="t-section-title text-navy">
                  Atmospheric event or sensor failure?
                </h2>
                <p className="t-body text-ink-muted mt-1">
                  Examine three representative benchmark cases in real-world meteorological conditions. Notice how multi-parameter physical coupling protects real storm events from being discarded.
                </p>
              </div>
              <WhatChangedBand />
            </section>

            {/* ── 02 How MetShield Decides (Visual Pipeline) ── */}
            <section id="qc-engine" className="land-anchor space-y-4" aria-labelledby="qc-h">
              <div style={{ maxWidth: '78ch' }}>
                <div className="t-label text-sky-deep font-bold mb-1">DECISION ARCHITECTURE</div>
                <h2 id="qc-h" className="t-section-title text-navy">
                  How MetShield QC decides
                </h2>
                <p className="t-body text-ink-muted mt-1">
                  The central problem in station quality management is telling a broken instrument apart from real
                  weather. Discarding a cyclone because the barometer dropped rapidly loses the event; accepting a failed
                  thermistor poisons the assimilation stream. The chain below details both the sequence and the exact numerical thresholds tested at each stage.
                </p>
              </div>
              <HowMetshieldDecidesBand />
              <details className="mt-4 border border-hairline rounded bg-surface-alt/40 p-3 group">
                <summary className="cursor-pointer font-mono text-[12px] font-bold text-navy hover:text-sky-deep flex items-center justify-between">
                  <span>► VIEW LITERAL ENGINE THRESHOLDS IN CODE (lib/anomalyLogic.ts)</span>
                  <span className="text-[11px] text-ink-muted font-normal">Click to expand audit details</span>
                </summary>
                <div className="mt-3">
                  <QcPipelineBand />
                </div>
              </details>
              <details className="mt-3 border border-hairline rounded bg-surface-alt/40 p-3 group">
                <summary className="cursor-pointer font-mono text-[12px] font-bold text-navy hover:text-sky-deep flex items-center justify-between gap-3">
                  <span>► INSPECT ENGINE RULE · STAGE 03 PHYSICAL CONSISTENCY</span>
                  <span className="text-[11px] text-ink-muted font-normal flex-none">
                    Open evaluate()
                  </span>
                </summary>
                <div className="mt-3">
                  <EngineRuleInspector />
                </div>
              </details>
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
            MetShield AI · Team AEROTECH1 (ID: 162136) · SIH 2026 Problem SIH26073 · Ministry of Earth Sciences / IMD
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/dashboard" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Console</Link>
            <Link href="/mobile" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Mobile Node (PWA)</Link>
            <Link href="/stations" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Network</Link>
            <Link href="/incidents" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Incidents</Link>
            <Link href="/audit-report" className="t-meta" style={{ color: 'var(--ink-muted)' }}>Audit report</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
