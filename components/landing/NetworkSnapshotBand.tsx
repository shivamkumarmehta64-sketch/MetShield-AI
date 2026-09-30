'use client';

import React, { useMemo } from 'react';
import { getNetworkSnapshot, computeKpis } from '@/lib/networkFeed';

/**
 * NetworkSnapshotBand:
 * Displayed immediately below hero.
 * 
 * Strict format:
 * NUMBER
 * LABEL
 * STATUS
 * 
 * Never use long sentences for primary metrics.
 */
export default function NetworkSnapshotBand() {
  const snapshot = getNetworkSnapshot();
  const kpis = useMemo(() => computeKpis(snapshot), [snapshot]);

  const cards = [
    {
      number: String(kpis.total),
      label: 'AWS STATIONS',
      status: 'ALL REGISTERED',
      statusTone: 'text-ink-muted',
      dotColor: 'var(--color-navy)',
    },
    {
      number: String(kpis.nominal),
      label: 'NOMINAL',
      status: 'PASSING QC',
      statusTone: 'text-healthy-text',
      dotColor: 'var(--color-healthy)',
    },
    {
      number: String(kpis.activeAnomalies),
      label: 'ATTENTION',
      status: `${kpis.activeFaults} FAULT · ${kpis.weatherEvents} STORM`,
      statusTone: kpis.activeFaults > 0 ? 'text-fault-text' : 'text-weather-text',
      dotColor: kpis.activeFaults > 0 ? 'var(--color-fault)' : 'var(--color-weather)',
    },
    {
      number: '5',
      label: 'CHANNELS',
      status: 'T, P, RH, WIND, RAIN',
      statusTone: 'text-sky-deep',
      dotColor: 'var(--color-sky-deep)',
    },
    {
      number: snapshot.dataMode,
      label: 'DATA MODE',
      status: 'DETERMINISTIC RUN',
      statusTone: 'text-ink-faint',
      dotColor: 'var(--color-ink-faint)',
      isBadgeNum: true,
    },
  ];

  return (
    <div className="card overflow-hidden border border-hairline bg-card shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
        {cards.map((c) => (
          <div key={c.label} className="p-4 flex flex-col justify-between">
            <div>
              <div className="t-label text-ink-muted mb-1">{c.label}</div>
              <div className={`t-mono font-bold text-ink ${c.isBadgeNum ? 'text-[21px] leading-tight mt-1' : 'text-[28px] leading-none'}`}>
                {c.number}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.dotColor }} aria-hidden />
              <span className={`font-semibold uppercase tracking-wider ${c.statusTone}`}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
