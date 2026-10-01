'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

let audioCtx: AudioContext | null = null;

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

/**
 * Diurnal clear-sky solar irradiance estimate, in W/m², from the wall clock.
 *
 * WHAT THIS IS NOT: a measurement. There is no pyranometer on this node. The UI
 * labels it "Solar (est. from clock)" and it must keep doing so. The curve is a
 * half-sine raised over daylight hours; it says what the sun would plausibly be
 * doing, not what the sky is doing. Anything that treats it as an observation is
 * reading a sine function as a sensor.
 *
 * WHY THE HOUR IS PINNED TO IST
 * A `useState` initializer runs on the server AND on the client, so anything
 * zone-dependent inside it is a hydration mismatch waiting to happen: the Vercel
 * edge renders in IST, a phone can be anywhere, and `getHours()` returns the
 * *browser's local* hour. That threw React #418 on every load of this route for
 * any visitor outside IST. Proven: browser TZ Asia/Kolkata -> #418, TZ UTC ->
 * clean, because only the second happened to agree with the edge.
 *
 * The fix is not to remove the clock read - it is to make the read a pure function
 * of the *instant* rather than of the *observer*. `Asia/Kolkata` is the network's
 * reporting timezone (every station timestamp here is IST), so both sides resolve
 * the same hour for the same moment and hydration matches. The value is then
 * identical whether the node sits in Delhi or Dublin, which is also the only
 * defensible answer for an Indian weather network.
 *
 * A `useSyncExternalStore` version with a server snapshot of 0 was tried and
 * discarded: it silenced the error but pinned the figure to 0 forever, because on a
 * statically prerendered route React keeps the server snapshot for a value it cannot
 * see has changed. Hiding a clock read is not the same as removing the mismatch.
 */
function estimateSolarIrradiance(date: Date): number {
  const hr = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(date)
  );
  if (!Number.isFinite(hr) || hr < 6 || hr > 18) return 0;
  const solarPhase = Math.sin(((hr - 6) / 12) * Math.PI);
  return Math.round(solarPhase * 880 + 50);
}

export function useMobileSensors() {
  // Pressure & Elevation Delta (1 hPa ≈ 8.4m)
  const [pressure, setPressure] = useState<number>(1012.35);
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
  //
  // The solar estimate is a function of the wall clock, and the clock is a
  // function of the timezone. The previous version read `new Date().getHours()`,
  // which is *local* time: the server (Vercel edge, IST) and the browser (the
  // phone's own zone) computed different values for the same slot, so the first
  // client render never matched the server HTML and React threw #418 on every
  // load of this route for any visitor outside IST.
  //
  // estimateSolarIrradiance pins the hour to Asia/Kolkata, so the same instant
  // yields the same number on both sides regardless of where the phone is. That
  // is what makes the initializer deterministic — not the absence of a clock
  // read, which would only hide the divergence rather than remove it.
  const [solarRadiationWm2] = useState<number>(() => estimateSolarIrradiance(new Date()));
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
        sensor = new window.PressureSensor({ frequency: 1 });
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
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
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
      if (!audioCtx) {
        audioCtx = new AudioCtx();
      }
      const ctx = audioCtx;
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
