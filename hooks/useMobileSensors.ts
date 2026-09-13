'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PressureSensorInstance {
  pressure?: number;
  start(): void;
  stop(): void;
  addEventListener(type: 'reading' | 'error', listener: (event: SensorErrorEvent) => void): void;
}

interface SensorErrorEvent extends Event {
  error: { name: string; message?: string };
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
}

declare global {
  interface Window {
    PressureSensor?: new (options?: { frequency?: number }) => PressureSensorInstance;
  }
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }
}

function getCardinal(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return directions[index];
}

export function useMobileSensors() {
  // Pressure & Elevation Delta (1 hPa ≈ 8.4m)
  const [pressure, setPressure] = useState<number | null>(null);
  const [isHardwareActive, setIsHardwareActive] = useState<boolean>(false);
  const [sensorSource, setSensorSource] = useState<'hardware' | 'simulated'>('simulated');
  const [error, setError] = useState<string | null>(null);
  const [elevationDeltaMeters, setElevationDeltaMeters] = useState<number>(0);
  const [pressureDeltaHpa, setPressureDeltaHpa] = useState<number>(0);
  const baselinePressureRef = useRef<number | null>(null);

  // Compass / Wind Direction
  const [compassHeading, setCompassHeading] = useState<number>(225); // SW
  const [compassCardinal, setCompassCardinal] = useState<string>('SW');
  const [isOrientationActive, setIsOrientationActive] = useState<boolean>(false);

  // Accelerometer / Kinetic Wind Gust & Motion Intensity
  const [windGustKph, setWindGustKph] = useState<number>(14.5);
  const [motionIntensity, setMotionIntensity] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const lastShakeTimeRef = useRef<number>(0);

  // Solar Radiation / Battery
  const [solarRadiationWm2] = useState<number>(() => {
    const hr = new Date().getHours();
    if (hr >= 6 && hr <= 18) {
      const solarPhase = Math.sin(((hr - 6) / 12) * Math.PI);
      return Math.round(solarPhase * 880 + 50);
    }
    return 0;
  });
  const [batteryVoltage, setBatteryVoltage] = useState<number>(12.42);
  const [batteryLevel, setBatteryLevel] = useState<number>(94);

  // 1. Physical Barometer using Web Generic Sensor API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('PressureSensor' in window) || !window.PressureSensor) {
      const timer = setTimeout(() => {
        setIsHardwareActive(false);
        setSensorSource('simulated');
        setError('Web PressureSensor API not available on this device/browser. Using simulated AWS feed.');
      }, 0);
      return () => clearTimeout(timer);
    }

    let sensor: PressureSensorInstance | null = null;
    try {
      if (window.PressureSensor) {
        sensor = new window.PressureSensor({ frequency: 2 });
        sensor.addEventListener('reading', () => {
          if (sensor && typeof sensor.pressure === 'number' && !isNaN(sensor.pressure)) {
            const hpa = Math.round(sensor.pressure * 10) / 10;
            setPressure(hpa);
            setIsHardwareActive(true);
            setSensorSource('hardware');
            setError(null);

            // Establish or track baseline pressure for dynamic elevation variations
            if (baselinePressureRef.current === null) {
              baselinePressureRef.current = hpa;
            } else {
              const deltaP = Math.round((hpa - baselinePressureRef.current) * 100) / 100;
              setPressureDeltaHpa(deltaP);
              // Standard barometric altimetry lapse: 1 hPa decrease ≈ 8.4 m height gain
              // -deltaP * 8.4m
              const elevationDelta = Math.round((-deltaP * 8.4) * 10) / 10;
              setElevationDeltaMeters(elevationDelta);
            }
          }
        });
        sensor.addEventListener('error', (event: SensorErrorEvent) => {
          setIsHardwareActive(false);
          setSensorSource('simulated');
          setError(`Hardware sensor error: ${event.error.name}`);
        });
        sensor.start();
      }
    } catch (err: unknown) {
      const timer = setTimeout(() => {
        setIsHardwareActive(false);
        setSensorSource('simulated');
        const msg = err instanceof Error ? err.message : 'Hardware sensor initialization failed';
        setError(msg);
      }, 0);
      return () => clearTimeout(timer);
    }

    return () => {
      if (sensor) {
        sensor.stop();
      }
    };
  }, []);

  // 2. Hardware Compass & Orientation (Wind Direction)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && !isNaN(e.alpha)) {
        const heading = Math.round(e.alpha);
        setCompassHeading(heading);
        setCompassCardinal(getCardinal(heading));
        setIsOrientationActive(true);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // 3. Hardware Accelerometer (Shake-to-Gust feature & Motion Intensity)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let baselineDecayTimer: NodeJS.Timeout | null = null;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const totalAcc = Math.round(Math.sqrt(x * x + y * y + z * z) * 10) / 10;
      
      setMotionIntensity(totalAcc);

      // Resting gravity is ~9.8 m/s^2. Vigorous shake is > 16.5 m/s^2
      if (totalAcc > 16.5) {
        const now = Date.now();
        lastShakeTimeRef.current = now;
        setIsShaking(true);
        const gust = Math.min(95, Math.round((totalAcc - 9.8) * 4.2 + 35));
        setWindGustKph(gust);

        if (baselineDecayTimer) clearTimeout(baselineDecayTimer);
        baselineDecayTimer = setTimeout(() => {
          setIsShaking(false);
          setWindGustKph(14.5 + Math.round((Math.random() - 0.5) * 4 * 10) / 10);
        }, 3500);
      }
    };

    window.addEventListener('devicemotion', handleMotion, true);
    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
      if (baselineDecayTimer) clearTimeout(baselineDecayTimer);
    };
  }, []);

  // 4. Battery Float Voltage & Diurnal Solar Irradiance
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () => {
          const pct = Math.round(battery.level * 100);
          setBatteryLevel(pct);
          const v = Math.round((11.8 + (battery.level * 0.9)) * 100) / 100;
          setBatteryVoltage(v);
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {
        // Fallback default float voltage
      });
    }
  }, []);

  // 5. Haptic Feedback Trigger
  const triggerHaptic = useCallback((pattern: number | number[] = [100, 50, 100]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  // 6. Web Audio API Acoustic Confirmation Chime
  const playTelemetryChime = useCallback((freq = 880, duration = 0.08) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  return {
    pressure,
    isHardwareActive,
    sensorSource,
    error,
    elevationDeltaMeters,
    pressureDeltaHpa,
    compassHeading,
    compassCardinal,
    isOrientationActive,
    windGustKph,
    isShaking,
    solarRadiationWm2,
    batteryVoltage,
    batteryLevel,
    motionIntensity,
    triggerHaptic,
    playTelemetryChime,
  };
}
