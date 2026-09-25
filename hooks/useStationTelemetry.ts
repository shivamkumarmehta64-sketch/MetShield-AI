import { useState, useEffect, useRef, useCallback } from 'react';
import { useMobileSensors } from './useMobileSensors';
import { evaluate3ParamQC, Reading3Param } from '../lib/anomalyDetector';
import { TelemetryPacket, createWorkOrder, WorkOrderTicket } from '../lib/anomalyLogic';
import { normalizeClientVerdict } from '../lib/normalizePacket';
import { IMDStationProfile } from '../lib/stationData';

export interface ChartPoint {
  timeIST: string;
  timestamp: number;
  temperature: number;
  pressure: number;
  humidity: number;
  imputedTemp?: number;
  imputedPress?: number;
  imputedHum?: number;
  isAnomaly?: boolean;
}

export function useStationTelemetry(
  currentStation: IMDStationProfile,
  isDCPActive: boolean = true,
  mode: 'live' | 'simulation' = 'live'
) {
  const mobileSensors = useMobileSensors();

  const [ingestionCount, setIngestionCount] = useState<number>(1420);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('Just now');
  const [telemetryHistory, setTelemetryHistory] = useState<ChartPoint[]>([]);

  // Normalized packets to feed directly to console components
  const [latestPackets, setLatestPackets] = useState<Record<string, TelemetryPacket>>({});

  // Normalized work orders for GovAnomalyRegister
  const [incidents, setIncidents] = useState<WorkOrderTicket[]>([]);

  const [benchInjectionMode, setBenchInjectionMode] = useState<string | null>(null);

  const rawHistoryRef = useRef<Reading3Param[]>([]);
  const isHydratedRef = useRef(false);

  const getISTTime = useCallback(() => {
    const now = new Date();
    const ist = new Date(now.getTime() + 19800000);
    return ist.toTimeString().split(' ')[0];
  }, []);

  // Pre-fill dummy data to mimic the original startup
  useEffect(() => {
    if (isHydratedRef.current) return;
    const initialPoints: ChartPoint[] = [];
    const baseT = currentStation.baseline.tempMean;
    const baseP = currentStation.baseline.pressureMean;
    const baseRH = currentStation.baseline.humidityMean;
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const tTime = now - i * 2500;
      const istString = new Date(tTime + 19800000).toTimeString().split(' ')[0];
      const pt: ChartPoint = {
        timeIST: istString,
        timestamp: tTime,
        temperature: Math.round((baseT + (Math.random() - 0.5) * 0.4) * 10) / 10,
        pressure: Math.round((baseP + (Math.random() - 0.5) * 0.3) * 10) / 10,
        humidity: Math.round((baseRH + (Math.random() - 0.5) * 1.5) * 10) / 10,
      };
      initialPoints.push(pt);
      rawHistoryRef.current.push({
        temperature: pt.temperature,
        pressure: pt.pressure,
        humidity: pt.humidity,
        timestamp: pt.timestamp,
        stationId: currentStation.stationId,
      });
    }
    setTelemetryHistory(initialPoints);
    isHydratedRef.current = true;
  }, [currentStation]);

  useEffect(() => {
    if (!isDCPActive) return;

    const interval = setInterval(async () => {
      const timeStr = getISTTime();
      const now = Date.now();

      let nextT: number;
      let nextP: number;
      let nextRH: number;

      const stBaseT = currentStation.baseline.tempMean;
      const stBaseP = currentStation.baseline.pressureMean;
      const stBaseRH = currentStation.baseline.humidityMean;

      // Handle bench injection first
      if (mode === 'simulation' || mode === 'live') { // Keep bench active in both modes for offline testing
        if (benchInjectionMode === 'SPIKE_TEMP') {
          nextT = Math.round((stBaseT + 14.2) * 10) / 10;
          nextP = stBaseP + Math.round((Math.random() - 0.5) * 0.2 * 10) / 10;
          nextRH = stBaseRH + Math.round((Math.random() - 0.5) * 0.8 * 10) / 10;
          setBenchInjectionMode(null);
        } else if (benchInjectionMode === 'FREEZE_PROBE') {
          const lastVal = rawHistoryRef.current[rawHistoryRef.current.length - 1];
          nextT = lastVal ? lastVal.temperature : stBaseT;
          nextP = lastVal ? lastVal.pressure : stBaseP;
          nextRH = lastVal ? lastVal.humidity : stBaseRH;
        } else if (benchInjectionMode === 'STORM_CONVECTIVE') {
          nextT = Math.round((stBaseT - 2.8) * 10) / 10;
          nextP = Math.round((stBaseP - 3.4) * 10) / 10;
          nextRH = Math.round((stBaseRH + 18.5) * 10) / 10;
          setBenchInjectionMode(null);
        } else {
          nextT = Math.round((stBaseT + (Math.random() - 0.5) * 0.4) * 10) / 10;
          nextRH = Math.round((stBaseRH + (Math.random() - 0.5) * 1.0) * 10) / 10;

          if (mobileSensors.isHardwareActive && typeof mobileSensors.pressure === 'number') {
            nextP = mobileSensors.pressure;
          } else {
            nextP = Math.round((stBaseP + (Math.random() - 0.5) * 0.3) * 10) / 10;
          }
        }
      } else {
          nextT = stBaseT;
          nextRH = stBaseRH;
          nextP = stBaseP;
      }

      let activePacket: TelemetryPacket;

      if (mode === 'live') {
        const payload = {
          stationId: currentStation.stationId,
          temperature: nextT,
          pressure: nextP,
          humidity: nextRH,
          timestamp: now,
        };

        try {
          // Real backend engine request
          const res = await fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error('Live ingestion failed');
          const data = await res.json();
          activePacket = data.data as TelemetryPacket;

        } catch {
          // Fallback to local evaluation on network failure (client simulation)
          const currentReading: Reading3Param = { temperature: nextT, pressure: nextP, humidity: nextRH, timestamp: now, stationId: currentStation.stationId };
          const qcResult = evaluate3ParamQC(currentReading, rawHistoryRef.current);
          const packetId = `PKT-${currentStation.stationId.replace('AWS-','')}-${now.toString().slice(-6)}`;
          activePacket = normalizeClientVerdict(packetId, currentStation.stationId, now, timeStr, qcResult);
        }
      } else {
        // Strict Simulation - fallback to local evaluation
        const currentReading: Reading3Param = { temperature: nextT, pressure: nextP, humidity: nextRH, timestamp: now, stationId: currentStation.stationId };
        const qcResult = evaluate3ParamQC(currentReading, rawHistoryRef.current);
        const packetId = `PKT-${currentStation.stationId.replace('AWS-','')}-${now.toString().slice(-6)}`;
        activePacket = normalizeClientVerdict(packetId, currentStation.stationId, now, timeStr, qcResult);
      }

      const newChartPoint: ChartPoint = {
        timeIST: timeStr,
        timestamp: activePacket.timestamp,
        temperature: activePacket.raw.temperature ?? activePacket.imputed.temperature,
        pressure: activePacket.raw.pressure ?? activePacket.imputed.pressure,
        humidity: activePacket.raw.humidity ?? activePacket.imputed.humidity,
        imputedTemp: activePacket.imputed.wasCorrected ? activePacket.imputed.temperature : undefined,
        imputedPress: activePacket.imputed.wasCorrected ? activePacket.imputed.pressure : undefined,
        imputedHum: activePacket.imputed.wasCorrected ? activePacket.imputed.humidity : undefined,
        isAnomaly: activePacket.classification !== 'NOMINAL_OPERATION',
      };

      rawHistoryRef.current.push({
        temperature: activePacket.raw.temperature ?? activePacket.imputed.temperature,
        pressure: activePacket.raw.pressure ?? activePacket.imputed.pressure,
        humidity: activePacket.raw.humidity ?? activePacket.imputed.humidity,
        timestamp: activePacket.timestamp,
        stationId: activePacket.stationId,
      });

      if (rawHistoryRef.current.length > 40) {
        rawHistoryRef.current = rawHistoryRef.current.slice(-30);
      }

      setTelemetryHistory((prev) => [...prev.slice(-24), newChartPoint]);

      setLatestPackets((prev) => ({
        ...prev,
        [activePacket.stationId]: activePacket
      }));

      setLastHeartbeat(timeStr);
      setIngestionCount((prev) => prev + 1);

      if (activePacket.classification !== 'NOMINAL_OPERATION') {
        const wo = createWorkOrder(activePacket, 'SIM-INC');
        setIncidents((prev) => [wo, ...prev.slice(0, 19)]);

        if (activePacket.alertLevel === 'LEVEL_4_RED') {
          mobileSensors.playTelemetryChime?.(520, 0.15);
        } else if (activePacket.alertLevel === 'LEVEL_2_YELLOW' || activePacket.alertLevel === 'LEVEL_3_AMBER') {
          mobileSensors.playTelemetryChime?.(880, 0.1);
        }
      }

    }, 2500);

    return () => clearInterval(interval);
  }, [currentStation, isDCPActive, benchInjectionMode, mobileSensors, getISTTime, mode]);

  
  // Local Edge Sync: Instantly pull packets broadcasted by the Field Node tab
  useEffect(() => {
    const channel = new BroadcastChannel('imd_naws_telemetry_stream');
    channel.onmessage = (event) => {
      if (event.data?.type === 'MOBILE_PACKET_INGEST') {
        const activePacket = event.data.packet;
        
        setLatestPackets((prev) => ({
          ...prev,
          [activePacket.stationId]: activePacket
        }));
        
        const timeStr = new Date(activePacket.timestamp + 19800000).toTimeString().split(' ')[0];
        setLastHeartbeat(timeStr);
        setIngestionCount((prev) => prev + 1);

        if (activePacket.classification !== 'NOMINAL_OPERATION') {
          // createWorkOrder requires activePacket and ruleEngineMode
          setIncidents((prev) => {
             // Avoid duplicating if we already recorded it this second
             if (prev.some(w => w.ticketId.includes(activePacket.stationId) && Math.abs(new Date(w.timestamp).getTime() - activePacket.timestamp) < 5000)) return prev;
             
             // createWorkOrder is imported in this file
             // We need to construct it inline if missing or use the imported function
             // Fortunately createWorkOrder is imported from '../lib/anomalyLogic'
             // The second param is a string, e.g. 'SIM-INC'
             const wo = createWorkOrder(activePacket, 'MOB-SYNC');
             return [wo, ...prev.slice(0, 19)];
          });
          
          if (activePacket.alertLevel === 'LEVEL_4_RED') {
            mobileSensors.playTelemetryChime?.(520, 0.15);
          } else if (activePacket.alertLevel === 'LEVEL_2_YELLOW' || activePacket.alertLevel === 'LEVEL_3_AMBER') {
            mobileSensors.playTelemetryChime?.(880, 0.1);
          }
        }
      }
    };
    return () => channel.close();
  }, [mobileSensors]);

  return {
    ingestionCount,
    lastHeartbeat,
    telemetryHistory,
    latestPackets,
    incidents,
    setBenchInjectionMode,
    mobileSensors,
  };
}
