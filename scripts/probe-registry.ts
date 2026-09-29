/**
 * TEMPORARY PROBE — delete after the audit.
 * Prints the runtime truth about the station registry and the seeded snapshot.
 */
import { IMD_AWS_STATIONS } from '../lib/stationData';
import { getNetworkSnapshot, computeKpis, getIncidents } from '../lib/networkFeed';

console.log('IMD_AWS_STATIONS.length =', IMD_AWS_STATIONS.length);
console.log('ids:', IMD_AWS_STATIONS.map((s) => s.stationId).join(' '));

const snap = getNetworkSnapshot();
const k = computeKpis(snap);
console.log('\nsnapshot.stations.length =', snap.stations.length);
console.log('kpis =', JSON.stringify(k, null, 2));
console.log('historyDepth (min/max) =',
  Math.min(...snap.stations.map((s) => s.historyDepth)),
  Math.max(...snap.stations.map((s) => s.historyDepth)));
console.log('latestTimestamp =', new Date(snap.latestTimestamp).toISOString());
console.log('incidents =', getIncidents().length);
console.log('seeded stations present =',
  snap.stations.filter((s) => s.seededInjection).map((s) => `${s.stationId}:${s.health}`).join(' ') || 'none');
console.log('non-nominal stations =',
  snap.stations.filter((s) => s.health !== 'NOMINAL').map((s) => `${s.stationId}/${s.health}/${s.resolved ? 'resolved' : 'active'}`).join(' ') || 'none');
