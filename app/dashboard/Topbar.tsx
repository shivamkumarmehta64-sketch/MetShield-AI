'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Menu,
  Bell,
  Settings,
  X,
  Shield,
  Sliders,
  AlertTriangle,
  ArrowRight,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import DataModeBadge from './DataModeBadge';
import WmoFlagBadge from './WmoFlagBadge';
import { getNetworkSnapshot, computeKpis, classificationLabel } from '@/lib/networkFeed';

interface TopbarProps {
  breadcrumb: string;
  onOpenNav: () => void;
}

export default function Topbar({ breadcrumb, onOpenNav }: TopbarProps) {
  const [clock, setClock] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<'UTC' | 'IST'>('UTC');
  const [audioAlerts, setAudioAlerts] = useState(true);

  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsAlertsOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const snapshot = getNetworkSnapshot();
  const kpis = computeKpis(snapshot);
  const alerts = kpis.activeAnomalies;
  const nonNominalStations = snapshot.stations.filter((s) => s.health !== 'NOMINAL');

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-card px-4 lg:px-6" style={{ height: 56 }}>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenNav}
        className="touch-target -ml-2 flex items-center justify-center text-ink-muted lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3 min-w-0">
        <ArrowRight size={18} className="rotate-180 text-ink-muted" />
        <div className="t-body text-ink font-medium truncate">{breadcrumb}</div>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:gap-3">
        <div className="hidden sm:block">
          <DataModeBadge />
        </div>

        <div className="hidden md:flex items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search station, location..."
              className="pl-9 pr-4 py-1.5 rounded-full border border-hairline bg-surface-alt text-[13px] w-64 focus:outline-none focus:border-sky-deep focus:ring-1 focus:ring-sky-deep transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 border-r border-hairline">
          <Settings size={15} className="text-ink-muted" />
          <span className="t-meta font-mono text-[11.5px] whitespace-nowrap">{clock ?? '—'}</span>
        </div>

        {/* Notifications / Alerts Button */}
        <div className="relative" ref={alertsRef}>
          <button
            type="button"
            aria-label={alerts > 0 ? `${alerts} active anomalies` : 'No active anomalies'}
            aria-expanded={isAlertsOpen}
            onClick={() => {
              setIsAlertsOpen(!isAlertsOpen);
              setIsSettingsOpen(false);
            }}
            className="touch-target relative flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            <Bell size={19} />
            {alerts > 0 && (
              <span
                className="absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-fault-bg)',
                  color: 'var(--color-fault-text)',
                  border: '1px solid var(--color-fault-border)',
                }}
              >
                {alerts}
              </span>
            )}
          </button>

          {/* Alerts Flyout Dropdown */}
          {isAlertsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border border-hairline bg-card shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3 bg-surface-alt">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-warning" />
                  <span className="t-card-title text-[13.5px]">Active Anomalies ({alerts})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-ink-muted hover:text-ink p-1 rounded"
                  aria-label="Close notifications"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
                {nonNominalStations.length === 0 ? (
                  <div className="p-4 text-center t-meta text-ink-muted">
                    No active anomalies detected across registered stations.
                  </div>
                ) : (
                  nonNominalStations.map((st) => (
                    <div key={st.stationId} className="p-3.5 hover:bg-surface-hover transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="t-mono text-[12px] font-bold text-navy">{st.stationId}</span>
                        <WmoFlagBadge flag={st.wmoFlag} showName={false} />
                      </div>
                      <div className="t-body text-[13px] font-medium text-ink truncate">{st.name}</div>
                      <div className="t-meta text-[11.5px] mt-0.5 text-ink-muted">
                        {classificationLabel(st.classification)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-hairline bg-surface-alt p-2.5 text-center">
                <Link
                  href="/incidents"
                  onClick={() => setIsAlertsOpen(false)}
                  className="t-label inline-flex items-center gap-1 text-sky-deep hover:underline text-[11px]"
                >
                  View full incident registry <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Circle */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-deep text-white text-[11px] font-bold ml-1">
          SK
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="w-full max-w-md rounded-xl border border-hairline bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4 bg-surface-alt">
              <div className="flex items-center gap-2">
                <Sliders size={17} className="text-sky-deep" />
                <h2 id="settings-title" className="t-card-title text-navy">
                  Console Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded p-1 text-ink-muted hover:bg-surface-hover hover:text-ink"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 text-sm">
              {/* Data Mode & Environment */}
              <div>
                <span className="t-label block mb-1 text-ink-muted">Operational Data Mode</span>
                <div className="p-3 rounded-lg border border-hairline bg-surface-alt flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink">{snapshot.dataMode}</div>
                    <div className="t-meta text-[11.5px] mt-0.5">21 registered profiles · 14-tick deterministic pass</div>
                  </div>
                  <DataModeBadge />
                </div>
              </div>

              {/* Time Format */}
              <div>
                <span className="t-label block mb-1 text-ink-muted">Timestamp Display</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeFormat('UTC')}
                    className={`px-3 py-2 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      timeFormat === 'UTC'
                        ? 'border-sky-deep bg-sky-50 text-sky-deep'
                        : 'border-hairline text-ink-muted hover:bg-surface-hover'
                    }`}
                  >
                    {timeFormat === 'UTC' && <Check size={13} />} UTC (Z-time)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFormat('IST')}
                    className={`px-3 py-2 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      timeFormat === 'IST'
                        ? 'border-sky-deep bg-sky-50 text-sky-deep'
                        : 'border-hairline text-ink-muted hover:bg-surface-hover'
                    }`}
                  >
                    {timeFormat === 'IST' && <Check size={13} />} IST (UTC+5:30)
                  </button>
                </div>
              </div>

              {/* Audible Chime Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-semibold text-ink text-[13px]">Audible Alarm Chime</div>
                  <div className="t-meta text-[11.5px]">Play acoustic chime when critical hardware fault occurs</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={audioAlerts}
                  onClick={() => setAudioAlerts(!audioAlerts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    audioAlerts ? 'bg-sky-deep' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      audioAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Quality Standard */}
              <div className="border-t border-hairline pt-3">
                <div className="flex items-center gap-2 text-ink-muted t-meta text-[11.5px]">
                  <Shield size={14} className="text-healthy" />
                  <span>Aligned with applicable WMO-No. 8 & CIMO guide protocols</span>
                </div>
              </div>
            </div>

            <div className="border-t border-hairline px-5 py-3 bg-surface-alt flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 rounded bg-sky-deep text-white text-xs font-semibold hover:bg-blue-deep transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
