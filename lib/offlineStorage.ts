import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineTelemetryPacket {
  id?: number;
  stationId: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rainfall: number | null;
  solarRadiation: number | null;
  batteryVoltage: number | null;
  timestamp: number;
  lat: number | undefined;
  lon: number | undefined;
  deviceName: string;
  sensorSource: string;
}

interface MetshieldDB extends DBSchema {
  telemetryQueue: {
    key: number;
    value: OfflineTelemetryPacket;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<MetshieldDB>> | null = null;

export function initDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<MetshieldDB>('metshield-pwa-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('telemetryQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function saveReadingLocally(packet: OfflineTelemetryPacket): Promise<number | undefined> {
  const db = await initDB();
  if (!db) return;
  return db.add('telemetryQueue', packet);
}

export async function getQueuedReadings(): Promise<OfflineTelemetryPacket[]> {
  const db = await initDB();
  if (!db) return [];
  return db.getAllFromIndex('telemetryQueue', 'by-timestamp');
}

export async function clearQueuedReading(id: number): Promise<void> {
  const db = await initDB();
  if (!db) return;
  await db.delete('telemetryQueue', id);
}

export async function clearAllQueuedReadings(): Promise<void> {
  const db = await initDB();
  if (!db) return;
  await db.clear('telemetryQueue');
}
