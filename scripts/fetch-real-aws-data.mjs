// Fetch real hourly AWS-like records from Meteostat bulk (derived from ISD/GHCN
// station observations) and report what we actually got.
//
// Output: data/real/<wmo>.csv  (UTC hourly, temp °C, rh %, pres hPa)
import { mkdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const STATIONS = [
  { wmo: '42182', name: 'Safdarjung, New Delhi', lat: 28.585, lon: 77.206, elev: 216 },
  { wmo: '43057', name: 'Colaba, Mumbai', lat: 18.9, lon: 72.815, elev: 11 },
  { wmo: '43279', name: 'Meenambakkam, Chennai', lat: 12.994, lon: 80.181, elev: 16 },
  { wmo: '42807', name: 'Alipore, Kolkata', lat: 22.533, lon: 88.333, elev: 6 },
  { wmo: '43371', name: 'Thiruvananthapuram', lat: 8.506, lon: 76.956, elev: 15 },
];

const OUT = 'data/real';
mkdirSync(OUT, { recursive: true });

for (const s of STATIONS) {
  const url = `https://bulk.meteostat.net/v2/hourly/${s.wmo}.csv.gz`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${s.wmo} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const csv = gunzipSync(buf).toString('utf8');
  const lines = csv.split('\n').filter(Boolean);
  console.log(`\n=== ${s.wmo} ${s.name} ===`);
  console.log(`raw lines: ${lines.length}`);
  console.log(`header: ${lines[0]}`);
  console.log(`first:  ${lines[1]}`);
  console.log(`last:   ${lines[lines.length - 1]}`);

  writeFileSync(`${OUT}/${s.wmo}.csv`, csv);
  writeFileSync(
    `${OUT}/${s.wmo}.meta.json`,
    JSON.stringify({ ...s, source: 'meteostat hourly bulk v2 (ISD/GHCN derived)', header: lines[0] }, null, 2)
  );
}
