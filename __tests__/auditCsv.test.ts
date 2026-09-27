import { describe, it, expect } from 'vitest';
import { generateAuditCsvContent, sanitizeCsvCellForTest } from '../lib/supabaseClient';
import type { StoredFaultEvent } from '../lib/supabaseClient';

/**
 * Integrity coverage for the NIC/MoES audit CSV export.
 *
 * This is the compliance artifact of the whole product — the file a reviewer
 * would actually download and trust. It was emitting 8 header columns while
 * writing `rawVal` twice (Temp AND Pres) and a literal `0` for RH, so the
 * pressure column was a duplicate of the temperature column and humidity was
 * always zero. The numbers were also never passed through the CSV-injection
 * guard that the string columns use.
 *
 * These tests are written to FAIL against the current implementation. They are
 * the specification for the Phase 2 fix, not a description of today's output.
 */

const HEADER_COLUMNS = [
  'Station_ID',
  'Timestamp_IST',
  'Temp_C',
  'Pres_hPa',
  'RH_pct',
  'WMO_QC_Flag',
  'XAI_Reasoning',
  'Imputed_Value',
];

function makeEvent(overrides: Partial<StoredFaultEvent> = {}): StoredFaultEvent {
  return {
    eventId: 'EVT-TEST-1',
    stationId: 'AWS-DEL-04',
    timestamp: '2026-09-27T11:30:00.000Z',
    timeIST: '27-09-2026 17:00:00 IST',
    parameter: 'temperature',
    rawVal: 31.4,
    imputedVal: 0,
    classification: 'FLAG_1_NOMINAL',
    severity: 'INFO',
    xaiAttribution: {
      tempWeight: 91.5,
      pressWeight: 4.2,
      humWeight: 4.3,
      explanation: 'No anomaly detected across the observation window.',
    },
    recommendedAction: 'No action required.',
    ...overrides,
  };
}

/** Split one CSV line, honouring RFC-4180 double-quote escaping. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function dataLines(csv: string): string[] {
  return csv.split('\n').filter((l) => l.length > 0 && !l.startsWith('#'));
}

describe('generateAuditCsvContent — column contract', () => {
  it('emits a header naming all 8 declared audit columns', () => {
    const lines = dataLines(generateAuditCsvContent([makeEvent()]));
    expect(lines[0]).toBe(HEADER_COLUMNS.join(','));
  });

  it('writes one field per header column on every data row', () => {
    const csv = generateAuditCsvContent([makeEvent()]);
    const lines = dataLines(csv);
    for (const line of lines.slice(1)) {
      expect(splitCsvLine(line)).toHaveLength(HEADER_COLUMNS.length);
    }
  });

  it('does NOT write the temperature value into the pressure column', () => {
    // FAILS TODAY: both Temp_C and Pres_hPa are populated from `rawVal`.
    const csv = generateAuditCsvContent([makeEvent({ rawVal: 31.4 })]);
    const row = splitCsvLine(dataLines(csv)[1]);
    const temp = row[HEADER_COLUMNS.indexOf('Temp_C')];
    const press = row[HEADER_COLUMNS.indexOf('Pres_hPa')];
    expect(press, 'Pres_hPa duplicates Temp_C — the export is fabricating pressure').not.toBe(temp);
  });

  it('does NOT write a hardcoded 0 into the humidity column', () => {
    // FAILS TODAY: RH_pct is the literal 0 for every row.
    const csv = generateAuditCsvContent([makeEvent({ rawVal: 31.4 })]);
    const row = splitCsvLine(dataLines(csv)[1]);
    const rh = row[HEADER_COLUMNS.indexOf('RH_pct')];
    expect(rh, 'RH_pct is hardcoded to 0 — the export is fabricating humidity').not.toBe('0');
  });

  it('carries the real per-channel values when the event supplies them', () => {
    // FAILS TODAY: StoredFaultEvent has no pres_hPa / rh_pct fields to read.
    const event = makeEvent({ rawVal: 31.4, pres_hPa: 1004.2, rh_pct: 62 });
    const csv = generateAuditCsvContent([event]);
    const row = splitCsvLine(dataLines(csv)[1]);
    expect(row[HEADER_COLUMNS.indexOf('Temp_C')]).toBe('31.4');
    expect(row[HEADER_COLUMNS.indexOf('Pres_hPa')]).toBe('1004.2');
    expect(row[HEADER_COLUMNS.indexOf('RH_pct')]).toBe('62');
  });
});

describe('generateAuditCsvContent — spreadsheet injection safety', () => {
  it('neutralizes a formula prefix in a free-text reasoning field', () => {
    const csv = generateAuditCsvContent([
      makeEvent({
        xaiAttribution: {
          tempWeight: 50,
          pressWeight: 25,
          humWeight: 25,
          explanation: '=HYPERLINK("http://evil","click")',
        },
      }),
    ]);
    expect(csv).not.toMatch(/,=HYPERLINK/);
  });

  it('neutralizes a formula prefix in a NUMERIC column too', () => {
    // FAILS TODAY: numeric columns bypass sanitizeCsvCell entirely, so a
    // hostile string arriving through a numeric field is exported verbatim.
    const csv = generateAuditCsvContent([makeEvent({ rawVal: '+cmd|calc' as unknown as number })]);
    const row = splitCsvLine(dataLines(csv)[1]);
    expect(row[HEADER_COLUMNS.indexOf('Temp_C')].startsWith('+')).toBe(false);
  });

  it('escapes embedded quotes without breaking the column count', () => {
    const csv = generateAuditCsvContent([
      makeEvent({ recommendedAction: 'He said "recalibrate", then left.' }),
    ]);
    const row = splitCsvLine(dataLines(csv)[1]);
    expect(row).toHaveLength(HEADER_COLUMNS.length);
  });

  it('exposes the sanitizer for direct unit testing', () => {
    expect(sanitizeCsvCellForTest('=1+1')).toBe('"\'=1+1"');
    expect(sanitizeCsvCellForTest('plain')).toBe('"plain"');
  });
});
