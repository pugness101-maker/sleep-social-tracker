import * as XLSX from 'xlsx';
import { addDays, format, isValid, parse } from 'date-fns';
import type { NapEntry, SleepEntry } from '../types';
import { generateId, toLocalISO } from './dates';

export type SpreadsheetImportMode = 'merge' | 'replace';

export interface ColumnMapping {
  date: string | null;
  sleepStart: string | null;
  wakeUp: string | null;
  sleepDuration: string | null;
  napStart: string | null;
  napEnd: string | null;
  napDuration: string | null;
  notes: string | null;
}

export interface SpreadsheetSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface SpreadsheetWorkbook {
  fileName: string;
  sheets: SpreadsheetSheet[];
}

export interface PreviewRow {
  rowNumber: number;
  date: string;
  sleep: string;
  nap: string;
  notes: string;
  status: 'ok' | 'skipped' | 'warning' | 'error';
  messages: string[];
}

export interface SpreadsheetParseResult {
  sleepEntries: Omit<SleepEntry, 'id' | 'createdAt'>[];
  napEntries: Omit<NapEntry, 'id' | 'createdAt'>[];
  previewRows: PreviewRow[];
  sleepCount: number;
  napCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
}

export const SPREADSHEET_FIELD_LABELS: {
  key: keyof ColumnMapping;
  label: string;
  required?: boolean;
}[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'sleepStart', label: 'Bedtime (sleep start)' },
  { key: 'wakeUp', label: 'Wake-up' },
  { key: 'sleepDuration', label: 'Sleep duration (optional)' },
  { key: 'napStart', label: 'Nap start' },
  { key: 'napEnd', label: 'Nap end' },
  { key: 'napDuration', label: 'Nap duration (optional)' },
  { key: 'notes', label: 'Notes (optional)' },
];

const COLUMN_PATTERNS: { field: keyof ColumnMapping; patterns: RegExp[] }[] = [
  { field: 'date', patterns: [/^date$/i] },
  { field: 'sleepStart', patterns: [/bed\s*time/i, /bedtime/i, /sleep\s*start/i] },
  { field: 'wakeUp', patterns: [/wake[\s-]*up/i, /wakeup/i, /wake\s*time/i] },
  { field: 'sleepDuration', patterns: [/sleep\s*duration/i] },
  { field: 'napStart', patterns: [/nap\s*start/i] },
  { field: 'napEnd', patterns: [/nap\s*end/i] },
  { field: 'napDuration', patterns: [/nap\s*duration/i] },
  { field: 'notes', patterns: [/^notes?$/i, /^comment/i] },
];

function emptyMapping(): ColumnMapping {
  return {
    date: null,
    sleepStart: null,
    wakeUp: null,
    sleepDuration: null,
    napStart: null,
    napEnd: null,
    napDuration: null,
    notes: null,
  };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: unknown): boolean {
  return cellText(value) === '';
}

function excelSerialToDate(serial: number): Date {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return new Date(NaN);
  return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S));
}

function parseDateOnly(value: unknown): Date | null {
  if (isBlank(value)) return null;

  if (value instanceof Date && isValid(value)) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number') {
    const d = excelSerialToDate(value);
    if (isValid(d)) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  const str = cellText(value);
  const formats = ['yyyy-MM-dd', 'M/d/yyyy', 'MM/dd/yyyy', 'M/d/yy', 'yyyy/M/d', 'MMM d, yyyy'];
  for (const fmt of formats) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed)) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) {
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  return null;
}

function parseTimeOnDate(value: unknown, baseDate: Date): Date | null {
  if (isBlank(value)) return null;

  if (value instanceof Date && isValid(value)) {
    const d = new Date(baseDate);
    d.setHours(value.getHours(), value.getMinutes(), 0, 0);
    return d;
  }

  if (typeof value === 'number') {
    if (value >= 1) {
      const full = excelSerialToDate(value);
      if (isValid(full)) {
        const d = new Date(baseDate);
        d.setHours(full.getHours(), full.getMinutes(), 0, 0);
        return d;
      }
    } else if (value >= 0) {
      const totalMinutes = Math.round(value * 24 * 60);
      const d = new Date(baseDate);
      d.setHours(Math.floor(totalMinutes / 60) % 24, totalMinutes % 60, 0, 0);
      return d;
    }
  }

  const str = cellText(value);
  const timeFormats = ['h:mm a', 'hh:mm a', 'H:mm', 'HH:mm', 'h:mm:ss a', 'H:mm:ss'];
  for (const fmt of timeFormats) {
    const parsed = parse(str, fmt, baseDate);
    if (isValid(parsed)) return parsed;
  }

  const iso = Date.parse(`${format(baseDate, 'yyyy-MM-dd')} ${str}`);
  if (!Number.isNaN(iso)) {
    const d = new Date(iso);
    if (isValid(d)) return d;
  }

  return null;
}

function parseDurationMinutes(value: unknown): number | null {
  if (isBlank(value)) return null;

  if (typeof value === 'number') {
    if (value > 0 && value < 1) {
      return Math.round(value * 24 * 60);
    }
    if (value >= 1 && value <= 24) {
      return Math.round(value * 60);
    }
    if (value > 24) {
      return Math.round(value);
    }
  }

  const str = cellText(value).toLowerCase();
  const hMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
  const mMatch = str.match(/(\d+)\s*m/);
  if (hMatch || mMatch) {
    const hours = hMatch ? parseFloat(hMatch[1]) : 0;
    const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
    return Math.round(hours * 60 + mins);
  }

  const colon = str.match(/^(\d+):(\d+)$/);
  if (colon) {
    return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  }

  const numeric = parseFloat(str);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric <= 24 ? Math.round(numeric * 60) : Math.round(numeric);
  }

  return null;
}

function resolveEndTime(
  start: Date,
  endValue: unknown,
  durationValue: unknown,
  baseDate: Date
): { end: Date | null; warning?: string } {
  let end = parseTimeOnDate(endValue, baseDate);

  if (end && end <= start) {
    end = addDays(end, 1);
  }

  if (!end) {
    const duration = parseDurationMinutes(durationValue);
    if (duration !== null) {
      end = new Date(start.getTime() + duration * 60_000);
      return { end, warning: 'End time calculated from duration.' };
    }
    return { end: null };
  }

  return { end };
}

function dateToLocalISO(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function formatPreviewRange(start: Date, end: Date): string {
  return `${format(start, 'MMM d h:mm a')} → ${format(end, 'h:mm a')}`;
}

export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping();
  const used = new Set<string>();

  for (const { field, patterns } of COLUMN_PATTERNS) {
    for (const header of headers) {
      const trimmed = header.trim();
      if (used.has(trimmed)) continue;
      if (patterns.some((p) => p.test(trimmed))) {
        mapping[field] = trimmed;
        used.add(trimmed);
        break;
      }
    }
  }

  return mapping;
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer, fileName: string): SpreadsheetWorkbook | { error: string } {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames.length) {
      return { error: 'The file contains no sheets.' };
    }

    const sheets: SpreadsheetSheet[] = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      if (!matrix.length) {
        return { name, headers: [], rows: [] };
      }

      const rawHeaders = (matrix[0] as unknown[]).map((h) => cellText(h));
      const headers = rawHeaders.map((h, i) => h || `Column ${i + 1}`);
      const rows = matrix.slice(1).map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          obj[header] = (row as unknown[])[index] ?? '';
        });
        return obj;
      });

      return { name, headers, rows };
    });

    const hasData = sheets.some((s) => s.headers.length > 0 && s.rows.length > 0);
    if (!hasData) {
      return { error: 'No data rows found in the spreadsheet.' };
    }

    return { fileName, sheets };
  } catch {
    return { error: 'Could not parse the spreadsheet file. Check that it is a valid .xlsx or .csv file.' };
  }
}

export async function readSpreadsheetFile(file: File): Promise<SpreadsheetWorkbook | { error: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'xlsx' && ext !== 'csv') {
    return { error: 'Unsupported file type. Please upload a .xlsx or .csv file.' };
  }

  try {
    const buffer = await file.arrayBuffer();
    return parseSpreadsheetBuffer(buffer, file.name);
  } catch {
    return { error: 'Could not read the file.' };
  }
}

function isRowEmpty(row: Record<string, unknown>, mapping: ColumnMapping): boolean {
  const columns = Object.values(mapping).filter((col): col is string => !!col);
  if (!columns.length) return true;
  return columns.every((col) => isBlank(row[col]));
}

function getCell(row: Record<string, unknown>, column: string | null): unknown {
  if (!column) return '';
  return row[column] ?? '';
}

export function parseSpreadsheetRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping
): SpreadsheetParseResult {
  const sleepEntries: Omit<SleepEntry, 'id' | 'createdAt'>[] = [];
  const napEntries: Omit<NapEntry, 'id' | 'createdAt'>[] = [];
  const previewRows: PreviewRow[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!mapping.date) {
    return {
      sleepEntries: [],
      napEntries: [],
      previewRows: [],
      sleepCount: 0,
      napCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: ['Date column mapping is required.'],
    };
  }

  let skippedCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const messages: string[] = [];

    if (isRowEmpty(row, mapping)) {
      skippedCount += 1;
      if (previewRows.length < 10) {
        previewRows.push({
          rowNumber,
          date: '—',
          sleep: '—',
          nap: '—',
          notes: '—',
          status: 'skipped',
          messages: ['Empty row'],
        });
      }
      return;
    }

    const baseDate = parseDateOnly(getCell(row, mapping.date));
    if (!baseDate) {
      skippedCount += 1;
      const msg = 'Invalid or missing date';
      errors.push(`Row ${rowNumber}: ${msg}`);
      if (previewRows.length < 10) {
        previewRows.push({
          rowNumber,
          date: cellText(getCell(row, mapping.date)) || '—',
          sleep: '—',
          nap: '—',
          notes: cellText(getCell(row, mapping.notes)) || '—',
          status: 'error',
          messages: [msg],
        });
      }
      return;
    }

    const notes = cellText(getCell(row, mapping.notes));
    const dateLabel = format(baseDate, 'MMM d, yyyy');
    let sleepPreview = '—';
    let napPreview = '—';
    let status: PreviewRow['status'] = 'ok';

    const hasSleep = !isBlank(getCell(row, mapping.sleepStart)) && (
      !isBlank(getCell(row, mapping.wakeUp)) || !isBlank(getCell(row, mapping.sleepDuration))
    );
    const hasNap = !isBlank(getCell(row, mapping.napStart)) && (
      !isBlank(getCell(row, mapping.napEnd)) || !isBlank(getCell(row, mapping.napDuration))
    );

    if (!hasSleep && !hasNap) {
      skippedCount += 1;
      if (previewRows.length < 10) {
        previewRows.push({
          rowNumber,
          date: dateLabel,
          sleep: '—',
          nap: '—',
          notes: notes || '—',
          status: 'skipped',
          messages: ['No sleep or nap times found'],
        });
      }
      return;
    }

    if (hasSleep) {
      const sleepStart = parseTimeOnDate(getCell(row, mapping.sleepStart), baseDate);
      if (!sleepStart) {
        status = 'error';
        messages.push('Invalid bedtime');
        errors.push(`Row ${rowNumber}: Invalid bedtime`);
      } else {
        const { end: wakeUp, warning } = resolveEndTime(
          sleepStart,
          getCell(row, mapping.wakeUp),
          getCell(row, mapping.sleepDuration),
          baseDate
        );
        if (warning) {
          messages.push(warning);
          if (status === 'ok') status = 'warning';
        }
        if (!wakeUp) {
          status = 'error';
          messages.push('Missing wake-up time or sleep duration');
          errors.push(`Row ${rowNumber}: Missing wake-up time or sleep duration`);
        } else {
          sleepEntries.push({
            sleepStart: dateToLocalISO(sleepStart),
            wakeUp: dateToLocalISO(wakeUp),
            notes,
          });
          sleepPreview = formatPreviewRange(sleepStart, wakeUp);
        }
      }
    }

    if (hasNap) {
      const napStart = parseTimeOnDate(getCell(row, mapping.napStart), baseDate);
      if (!napStart) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push('Invalid nap start');
        warnings.push(`Row ${rowNumber}: Invalid nap start`);
      } else {
        const { end: napEnd, warning } = resolveEndTime(
          napStart,
          getCell(row, mapping.napEnd),
          getCell(row, mapping.napDuration),
          baseDate
        );
        if (warning) {
          messages.push(warning);
          if (status === 'ok') status = 'warning';
        }
        if (!napEnd) {
          status = status === 'error' ? 'error' : 'warning';
          messages.push('Missing nap end or duration');
          warnings.push(`Row ${rowNumber}: Missing nap end or duration`);
        } else {
          napEntries.push({
            napStart: dateToLocalISO(napStart),
            napEnd: dateToLocalISO(napEnd),
            notes,
          });
          napPreview = formatPreviewRange(napStart, napEnd);
        }
      }
    }

    if (previewRows.length < 10) {
      previewRows.push({
        rowNumber,
        date: dateLabel,
        sleep: sleepPreview,
        nap: napPreview,
        notes: notes || '—',
        status,
        messages,
      });
    }
  });

  return {
    sleepEntries,
    napEntries,
    previewRows,
    sleepCount: sleepEntries.length,
    napCount: napEntries.length,
    skippedCount,
    warnings,
    errors,
  };
}

export function applySpreadsheetImport(
  currentSleep: SleepEntry[],
  currentNaps: NapEntry[],
  sleepEntries: Omit<SleepEntry, 'id' | 'createdAt'>[],
  napEntries: Omit<NapEntry, 'id' | 'createdAt'>[],
  mode: SpreadsheetImportMode
): { sleepEntries: SleepEntry[]; napEntries: NapEntry[] } {
  const stamp = toLocalISO();
  const importedSleep: SleepEntry[] = sleepEntries.map((entry) => ({
    ...entry,
    id: generateId(),
    createdAt: stamp,
  }));
  const importedNaps: NapEntry[] = napEntries.map((entry) => ({
    ...entry,
    id: generateId(),
    createdAt: stamp,
  }));

  if (mode === 'replace') {
    return { sleepEntries: importedSleep, napEntries: importedNaps };
  }

  return {
    sleepEntries: [...currentSleep, ...importedSleep],
    napEntries: [...currentNaps, ...importedNaps],
  };
}

export function mappingOptions(headers: string[]): { value: string; label: string }[] {
  return [
    { value: '', label: '— Not mapped —' },
    ...headers.map((h) => ({ value: h, label: h })),
  ];
}

export function validateMapping(mapping: ColumnMapping): string | null {
  if (!mapping.date) {
    return 'Please map a Date column.';
  }

  const hasSleep = !!mapping.sleepStart && (!!mapping.wakeUp || !!mapping.sleepDuration);
  const hasNap = !!mapping.napStart && (!!mapping.napEnd || !!mapping.napDuration);

  if (!hasSleep && !hasNap) {
    return 'Map bedtime + wake-up (or sleep duration), or nap start + nap end (or nap duration).';
  }

  if (mapping.sleepStart && !mapping.wakeUp && !mapping.sleepDuration) {
    return 'Bedtime requires wake-up or sleep duration.';
  }

  if (mapping.napStart && !mapping.napEnd && !mapping.napDuration) {
    return 'Nap start requires nap end or nap duration.';
  }

  return null;
}
