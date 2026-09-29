'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import Shell from '../dashboard/Shell';
import DataModeBadge from '../dashboard/DataModeBadge';
import { getNetworkSnapshot, type StationHealth } from '@/lib/networkFeed';
import { getInitialSeededDataset, type WMOQualityFlag } from '@/lib/anomalyLogic';

/**
 * §K / §15 — the audit trail.
 *
 * WHAT CHANGED HERE, AND WHY IT MATTERS
 *
 * The previous build of this page was titled "CRYPTOGRAPHIC AUDIT DOSSIER",
 * subtitled "HMAC-SHA256 · Merkle Chain · NABL Work Orders", columned its
 * checksums "HMAC SEAL" and "MERKLE ROOT", and closed with a green
 * "✓ All 1,247 packets verified".
 *
 * Every one of those claims was false:
 *   - the "HMAC" is `computeDemoIntegritySeal`, two FNV-1a-style rolling
 *     checksums with no secret key, so it is not HMAC and not SHA-256;
 *   - the "Merkle root" is the same function over the same input with its two
 *     halves swapped, so it is not a Merkle root and not independent;
 *   - nothing was verified — the seal has never been cryptographically
 *     verified, and `tamperStatus` is `DEMO_UNVERIFIED` on every packet;
 *   - 1,247 is not a packet count this project produces; the run makes
 *     21 stations x 14 ticks = 294;
 *   - the twelve rows referenced AWS-DEL-01, AWS-MUM-04, AWS-CCU-02, AWS-BHO-12,
 *     AWS-CHN-14 and others that are not in the registry, and every checksum
 *     shown was a hand-typed literal that matched no packet.
 *
 * A compliance surface that overstates its own guarantees is worse than one
 * that admits its limits, so this page now states them plainly and reports
 * what was actually computed.
 */

const TICK_SECONDS = 2500;

interface AuditRow {
  packetId: string;
  timestamp: string;
  stationId: string;
  wmoFlag: WMOQualityFlag;
  checksumA: string;
  checksumB: string;
  nonce: number;
  tamperStatus: 'DEMO_UNVERIFIED' | 'CORRUPTION_DETECTED';
  ticketId: string | null;
}

export default function AuditReportPage() {
  const snapshot = getNetworkSnapshot();
  const [flagFilter, setFlagFilter] = useState<StationHealth | 'ALL' | 'FLAGGED'>('FLAGGED');

  const rows = useMemo<AuditRow[]>(() => {
    const seed = getInitialSeededDataset();
    const out: AuditRow[] = [];
    for (const [stationId, packets] of Object.entries(seed.stationPackets) as [
      string,
      ReturnType<typeof getInitialSeededDataset>['stationPackets'][string],
    ][]) {
      for (const p of packets) {
        out.push({
          packetId: p.packetId,
          timestamp: new Date(p.timestamp).toISOString().replace('T', ' ').slice(0, 19),
          stationId,
          wmoFlag: p.wmoFlag,
          checksumA: p.securitySeal.hmacSha256,
          checksumB: p.securitySeal.auditMerkleRoot,
          nonce: p.securitySeal.antiReplayNonce,
          tamperStatus: p.securitySeal.tamperStatus,
          ticketId: p.ticketId,
        });
      }
    }
    return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, []);

  const visible = useMemo(() => {
    if (flagFilter === 'ALL') return rows;
    if (flagFilter === 'FLAGGED') return rows.filter((r) => r.wmoFlag !== 'FLAG_1_VERIFIED_GOOD');
    const flagForHealth: Partial<Record<StationHealth, AuditRow['wmoFlag']>> = {
      NOMINAL: 'FLAG_1_VERIFIED_GOOD',
      DRIFT: 'FLAG_3_SUSPECT_DRIFT',
      WEATHER_EVENT: 'FLAG_2_CONVECTIVE_STORM',
      FAULT: 'FLAG_4_CORRUPT_HARDWARE',
      TELEMETRY: 'FLAG_5_PACKET_LOSS',
    };
    return rows.filter((r) => r.wmoFlag === flagForHealth[flagFilter]);
  }, [rows, flagFilter]);

  const corruption = rows.filter((r) => r.tamperStatus === 'CORRUPTION_DETECTED').length;

  return (
    <Shell breadcrumb="Audit Trail">
      <div className="flex flex-col gap-5">
           <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="t-section-title text-navy">Telemetry audit trail</h1>
            <p className="t-body text-ink-muted">
              Audit log of packet ingestion. Checksum status: DEMO / UNVERIFIED
            </p>
          </div>
          <DataModeBadge />
        </div>

        {/* §15 — the integrity claim, stated correctly. This panel is the reason
            the page was rebuilt: the old one asserted a guarantee it did not have. */}
        <section
          className="card border-l-4 border-l-warning p-5"
          role="note"
          aria-label="Integrity seal disclosure"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0">
              <h2 className="t-card-title text-warning">
                The integrity seal is a non-cryptographic checksum
              </h2>
              <p className="t-body mt-2 text-ink-muted">
                The two columns below come from{' '}
                <code className="t-mono text-ink">computeDemoIntegritySeal</code>, which is a pair
                of FNV-style rolling checksums over the packet string. It has no secret key, so it
                is <strong className="text-ink">not HMAC-SHA256</strong>; the second value is the
                same function with its halves swapped, so it is{' '}
                <strong className="text-ink">not a Merkle root</strong> and not independent of the
                first. Anyone able to write a packet can recompute both in one pass, so the seal
                detects accidental corruption — a truncated write, a half-updated field — and
                provides no tamper resistance whatsoever.
              </p>
              <p className="t-body mt-2 text-ink-muted">
                Field names are retained only for back-compatibility. The engine sets{' '}
                <code className="t-mono text-ink">tamperStatus</code> to{' '}
                <code className="t-mono text-ink">DEMO_UNVERIFIED</code> on every packet because
                nothing here has been cryptographically verified. To make a tamper-evidence claim
                true, the function body has to be replaced with a real Web Crypto HMAC-SHA256 over a
                server-held secret — the label must not simply be changed back.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: 'Packets', value: rows.length, tone: 'text-ink' },
            { label: 'Provenance', value: 'SIMULATED', tone: 'text-ink-muted' },
            { label: 'Checksum Status', value: 'DEMO / UNVERIFIED', tone: 'text-warning' },
            { label: 'Corruption Detected', value: corruption, tone: corruption ? 'text-fault' : 'text-ink' },
            { label: 'Verified', value: 0, tone: 'text-fault' },
          ].map((k) => (
            <div key={k.label} className="card p-4">
              <div className="t-label">{k.label}</div>
              <div className={clsx('t-mono mt-1 text-[20px] font-bold', k.tone)}>{k.value}</div>
            </div>
          ))}
        </div>

        <section className="card overflow-hidden" aria-label="Packet integrity table">
          <div className="border-b border-hairline px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h2 className="t-card-title">Packet integrity fields</h2>
              <p className="t-meta">
                {visible.length} of {rows.length} packets · spacing between packets is{' '}
                {TICK_SECONDS / 1000} s of benchmark time
              </p>
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter packets">
              {(
                [
                  ['FLAGGED', 'Flagged only'],
                  ['ALL', 'All packets'],
                  ['FAULT', 'Fault'],
                  ['DRIFT', 'Drift'],
                  ['WEATHER_EVENT', 'Weather event'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFlagFilter(key)}
                  aria-pressed={flagFilter === key}
                  className={
                    flagFilter === key
                      ? 'touch-target rounded border border-hairline-strong bg-surface-alt px-2.5 text-[12px] font-semibold text-navy'
                      : 'touch-target rounded border border-hairline px-2.5 text-[12px] text-ink-muted hover:bg-surface-hover'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center t-body text-ink-muted">
              No packet matches this filter.
            </p>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Integrity fields carried by each packet the engine produced
                </caption>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-hairline bg-surface-alt">
                    {['Packet', 'Timestamp', 'Station', 'Classification', 'Provenance', 'Checksum Status', 'Action'].map(
                      (h) => (
                        <th key={h} scope="col" className="t-label whitespace-nowrap px-3 py-2.5">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    return (
                      <tr key={r.packetId} className="border-b border-hairline hover:bg-surface-hover">
                        <td className="t-mono px-3 py-2 text-[11.5px] whitespace-nowrap text-ink-muted">
                          {r.packetId}
                        </td>
                        <td className="t-mono px-3 py-2 text-[11.5px] whitespace-nowrap text-ink-muted">
                          {r.timestamp}
                        </td>
                        <td className="t-mono px-3 py-2 text-[12px] font-semibold whitespace-nowrap">
                          {r.stationId}
                        </td>
                        <td className="t-label px-3 py-2 text-ink-muted">
                          {r.wmoFlag.replace(/_/g, ' ')}
                        </td>
                        <td className="t-label px-3 py-2 text-ink-faint">
                          SIMULATED
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.tamperStatus === 'CORRUPTION_DETECTED' ? (
                            <span className="t-label inline-flex items-center gap-1 text-fault">
                              <AlertTriangle size={13} aria-hidden />
                              CORRUPTION DETECTED
                            </span>
                          ) : (
                            <span className="t-label text-warning">DEMO / UNVERIFIED</span>
                          )}
                        </td>
                        <td className="t-mono px-3 py-2 text-[11px] whitespace-nowrap text-ink-faint">
                          {r.ticketId ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-5" aria-label="Work orders">
          <h2 className="t-card-title">Work orders raised by the engine</h2>
          {snapshot.workOrders.length === 0 ? (
            <p className="t-body mt-2 text-ink-muted">No work orders were raised in this run.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {snapshot.workOrders.map((wo: (typeof snapshot.workOrders)[number]) => (
                <li key={wo.ticketId} className="border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="t-mono text-[12.5px] font-semibold">{wo.ticketId}</span>
                    <span className="t-mono text-[12px] text-ink-muted">
                      {wo.stationId} · {wo.stationName}
                    </span>
                    <span className="t-label ml-auto">{wo.status}</span>
                  </div>
                  <p className="t-body mt-1 text-ink-muted">{wo.operationalAction}</p>
                  <p className="t-meta">
                    {wo.parameterInvolved} · alert level {wo.alertLevel} · {wo.timestamp}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
