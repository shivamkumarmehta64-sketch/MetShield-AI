'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { GovHeader } from '@/components/GovHeader';
import { useStationTelemetry } from '@/hooks/useStationTelemetry';
import { IMD_AWS_STATIONS, getStationProfile } from '@/lib/stationData';
import { Wrench, Map, Brain, Cpu, Activity, LayoutGrid } from 'lucide-react';
import { ModuleNav } from '@/components/ui/ModuleNav';
import { Card } from '@/components/ui/Card';
import { ActiveModalType, GovInfoModals } from '@/components/GovInfoModals';
import { GovDatasetReplayModal } from '@/components/GovDatasetReplayModal';
import { GovEmergencyAlertModal } from '@/components/GovEmergencyAlertModal';
import { GovMobileQRModal } from '@/components/GovMobileQRModal';

// Primary Orphans
import { GovObservationConsole } from '@/components/GovObservationConsole';
import { GovNetworkMap } from '@/components/GovNetworkMap';
import { GovAnomalyRegister } from '@/components/GovAnomalyRegister';
import { GovNWPGatingPanel } from '@/components/GovNWPGatingPanel';
import { GovTimeLogicMatrix } from '@/components/GovTimeLogicMatrix';

// Secondary Orphans
import { VayuNationalDashboard } from '@/components/VayuNationalDashboard';
import { GovHeatwaveDSSPanel } from '@/components/GovHeatwaveDSSPanel';
import { GoogleStitchAIToolsSuite } from '@/components/GoogleStitchAIToolsSuite';
import { GovLiveIndiaAutoTester } from '@/components/GovLiveIndiaAutoTester';
import { GovIndiaDistrictSearch } from '@/components/GovIndiaDistrictSearch';
import { GovPredictiveMaintenancePanel } from '@/components/GovPredictiveMaintenancePanel';
import { GovNetworkStrip } from '@/components/GovNetworkStrip';

const SECONDARY_MODULES = [
  { id: 'vayu', label: 'National Vayu', icon: <Map /> },
  { id: 'heatwave', label: 'Heatwave DSS', icon: <Activity /> },
  { id: 'stitch', label: 'Google Stitch AI', icon: <Brain /> },
  { id: 'autoTester', label: 'Auto Tester', icon: <Cpu /> },
  { id: 'districtSearch', label: 'District Explorer', icon: <Map /> },
  { id: 'predictive', label: 'Predictive Maint.', icon: <Wrench /> },
];

export default function DashboardPage() {
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [showDatasetReplay, setShowDatasetReplay] = useState(false);
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [showEmergencyCap, setShowEmergencyCap] = useState(false);

  const [selectedStationId, setSelectedStationId] = useState(IMD_AWS_STATIONS[0].stationId);
  const currentStation = getStationProfile(selectedStationId);

  // mode: 'live' runs real inference via POST /api/telemetry
  const [isLiveApiMode, setIsLiveApiMode] = useState(true);

  const { latestPackets, incidents, setBenchInjectionMode } = useStationTelemetry(
    currentStation,
    true,
    isLiveApiMode ? 'live' : 'simulation'
  );

  const [activeModule, setActiveModule] = useState<'primary' | string>('primary');

  const header = (
    <GovHeader
      fontSizeLevel={fontSizeLevel}
      onFontSizeChange={(d) => setFontSizeLevel(Math.max(-1, Math.min(1, fontSizeLevel + d)))}
      isHighContrast={isHighContrast}
      onToggleContrast={() => setIsHighContrast(!isHighContrast)}
      language={language}
      onToggleLanguage={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      onOpenModal={setActiveModal}
      onOpenDatasetReplay={() => setShowDatasetReplay(true)}
      onOpenMobileQR={() => setShowMobileQR(true)}
      isLiveApiMode={isLiveApiMode}
    />
  );

  const packetsArray = Object.values(latestPackets);

  // In high contrast mode, attach a class to the body. Using useEffect for DOM mutation here.
  React.useEffect(() => {
    if (isHighContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
  }, [isHighContrast]);

  return (
    <AppShell variant="console" header={header} language={language}>
      <div className="max-w-[1750px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Network Strip & Module Toggles */}
        <div className="flex flex-col gap-4 mb-6">
          <GovNetworkStrip
            totalStations={IMD_AWS_STATIONS.length}
            onlineStations={IMD_AWS_STATIONS.length} // Simplified for demo
            qualityIndex={98.5}
            ingestInterval="2.5s"
            anomalyTally={{ critical: 0, convective: 0, drift: 0 }}
            language={language}
          />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModule('primary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold min-touch transition-colors ${
                activeModule === 'primary' ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Primary Ops Console
            </button>
            <div className="h-6 w-px bg-[var(--border-strong)]" />
            <ModuleNav
              tabs={SECONDARY_MODULES}
              activeId={activeModule}
              onChange={setActiveModule}
            />
          </div>
        </div>

        {/* Dynamic Route View */}
        {activeModule === 'primary' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* Left Column (8-col) : Map & Logic Matrix */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              <Card className="p-4 bg-[var(--surface-sunken)]">
                 {/* Live/Sim Toggle Header */}
                 <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Geospatial Operations Map</h2>
                  <button
                    onClick={() => setIsLiveApiMode(!isLiveApiMode)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                      isLiveApiMode
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {isLiveApiMode ? '● Live WMO Intake' : '○ Offline Simulation'}
                  </button>
                 </div>
                 <GovNetworkMap
                  latestPackets={latestPackets}
                  selectedStationId={selectedStationId}
                  onSelectStation={setSelectedStationId}
                  language={language}
                 />
              </Card>

              <GovObservationConsole
                selectedStation={currentStation}
                onSelectStation={setSelectedStationId}
                packets={packetsArray}
                language={language}
                onSimulateFault={(f) => {
                  const m = { spike: 'SPIKE_TEMP', storm: 'STORM_CONVECTIVE', freeze: 'FREEZE_PROBE', drift: 'CALIBRATION_DRIFT', reset: 'RESET' }[f];
                  if (m) setBenchInjectionMode(m === 'RESET' ? null : m);
                }}
              />

              <GovTimeLogicMatrix language={language} />
            </div>

            {/* Right Column (4-col) : Incident Stream & NWP Gating */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <GovAnomalyRegister
                workOrders={incidents}
                language={language}
                onOpenEmergencyAlert={() => setShowEmergencyCap(true)}
                onOpenMethodology={() => setActiveModal('methodology')}
              />

              <GovNWPGatingPanel
                latestPackets={latestPackets}
                language={language}
              />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeModule === 'vayu' && <VayuNationalDashboard onSelectDistrict={(id) => console.log('Vayu dist', id)} />}
            {activeModule === 'heatwave' && <GovHeatwaveDSSPanel selectedDistrictId={null} onSelectDistrict={() => {}} language={language} />}
            {activeModule === 'stitch' && <GoogleStitchAIToolsSuite />}
            {activeModule === 'autoTester' && <GovLiveIndiaAutoTester language={language} onOpenMobileQR={() => setShowMobileQR(true)} />}
            {activeModule === 'districtSearch' && <GovIndiaDistrictSearch onSelectStationProfile={() => {}} selectedStationId="" language={language} />}
            {activeModule === 'predictive' && <GovPredictiveMaintenancePanel packets={packetsArray} stationName={currentStation.name} language={language} />}
          </div>
        )}

      </div>

      {/* Modals from old global shell */}
      <GovInfoModals activeModal={activeModal} onClose={() => setActiveModal(null)} language={language} />
      <GovDatasetReplayModal isOpen={showDatasetReplay} onClose={() => setShowDatasetReplay(false)} language={language} />
      <GovEmergencyAlertModal isOpen={showEmergencyCap} onClose={() => setShowEmergencyCap(false)} language={language} packet={null} stationName="Delhi" state="DL" />
      <GovMobileQRModal isOpen={showMobileQR} onClose={() => setShowMobileQR(false)} language={language} />
    </AppShell>
  );
}
