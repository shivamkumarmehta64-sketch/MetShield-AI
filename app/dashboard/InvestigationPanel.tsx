'use client';

import React from 'react';
import { useSystem } from './SystemContext';
import { getNetworkSnapshot } from '@/lib/networkFeed';

export function InvestigationPanel() {
  const { state } = useSystem();
  const snapshot = getNetworkSnapshot();
  const selectedStationId = state.selectedStationId;
  const station = selectedStationId ? snapshot.byId[selectedStationId] : null;

  if (!station) return <div className="card p-4 text-sm text-ink-muted">Select a station to investigate.</div>;

  const { packet, decidedBy } = station;
  const isStorm = station.classification === 'GENUINE_CONVECTIVE_EVENT';
  const isFault = station.classification === 'SENSOR_SPIKE' || station.classification === 'FROZEN_VALUE';

  /**
   * Spatial validation is a property of the PACKET, not of the station
   * snapshot. The previous version read `station.spatialValidation`, which
   * does not exist on StationSnapshot, so the optional chain silently yielded
   * undefined and the panel rendered "0 / 3 agree" — asserting that a
   * three-neighbour consensus check had been run and found nobody in
   * agreement, when in fact it had never been evaluated at all.
   *
   * INSUFFICIENT_DATA means the spatial tier did not reach a decision, and the
   * panel now says so rather than reporting a fabricated consensus score.
   */
  const spatial = decidedBy.spatialValidation;

  return (
    <div className="card p-5 space-y-4 font-mono text-xs">
        <h2 className="font-bold text-sm border-b pb-2 mb-2">WHY WAS STATION {station.stationId} FLAGGED?</h2>
        
        <div className="space-y-3">
            <div>
                <div className="font-bold mb-1">THERMODYNAMIC CONSISTENCY</div>
                <div className="flex justify-between"><span>T</span> <span>Δ {packet.ratesOfChange.tempRoC}°C</span> <span>{Math.abs(packet.ratesOfChange.tempRoC) < 1 ? '✓' : '—'}</span></div>
                <div className="flex justify-between"><span>P</span> <span>Δ {packet.ratesOfChange.pressRoC} hPa</span> <span>{Math.abs(packet.ratesOfChange.pressRoC) < 1 ? '✓' : '—'}</span></div>
                <div className="flex justify-between"><span>RH</span> <span>Δ {packet.ratesOfChange.humRoC}%</span> <span>{Math.abs(packet.ratesOfChange.humRoC) < 10 ? '✓' : '—'}</span></div>
            </div>

            <div>
                <div className="font-bold mb-1">RATE OF CHANGE</div>
                <div className="flex justify-between"><span>Temperature</span> <span>{Math.abs(packet.ratesOfChange.tempRoC) < 4 ? 'PASS' : 'FAIL'}</span></div>
                <div className="flex justify-between"><span>Pressure</span> <span>{Math.abs(packet.ratesOfChange.pressRoC) < 2 ? 'PASS' : 'FAIL'}</span></div>
                <div className="flex justify-between"><span>Humidity</span> <span>{Math.abs(packet.ratesOfChange.humRoC) < 10 ? 'PASS' : 'FAIL'}</span></div>
            </div>

            <div>
                <div className="font-bold mb-1">SPATIAL AGREEMENT</div>
                {spatial && spatial.verdict !== 'INSUFFICIENT_DATA' ? (
                    <>
                        <div className="flex justify-between"><span>Neighbours consulted</span> <span>{spatial.nearestStations.length}</span></div>
                        <div className="flex justify-between"><span>Verdict</span> <span>{spatial.verdict === 'SINGLE_NODE_FAULT' ? 'SINGLE-NODE FAULT' : 'REGIONAL WEATHER'}</span></div>
                    </>
                ) : (
                    <div className="flex justify-between"><span>Neighbours consulted</span> <span>NOT EVALUATED</span></div>
                )}
            </div>
            
            <div>
                <div className="font-bold mb-1">EVIDENCE FUSION</div>
                <div className="flex justify-between"><span>Weather evidence</span> <span>{isStorm ? 'HIGH' : 'LOW'}</span></div>
                <div className="flex justify-between"><span>Sensor-fault evidence</span> <span>{isFault ? 'HIGH' : 'LOW'}</span></div>
            </div>
        </div>

        <div className={`mt-4 p-3 rounded font-bold border ${isStorm ? 'bg-amber-100 text-amber-900 border-amber-300' : isFault ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-900 border-slate-300'}`}>
            <div className="text-[10px] text-slate-500 mb-0.5">DECISION</div>
            {isStorm ? 'PRESERVE — GENUINE WEATHER EVENT' : isFault ? 'QUARANTINE — SENSOR ANOMALY' : 'NOMINAL'}
        </div>
        
         <div className={`p-2 rounded text-[10px] border ${isStorm ? 'bg-amber-50 text-amber-800 border-amber-200' : isFault ? 'bg-red-50 text-red-800 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            <div className="font-bold mb-0.5">ACTION</div>
            {packet.operationalAction}
        </div>
    </div>
  );
}
