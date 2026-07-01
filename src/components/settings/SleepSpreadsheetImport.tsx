import { useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/FormFields';
import {
  autoDetectColumnMapping,
  mappingOptions,
  parseSpreadsheetRows,
  readSpreadsheetFile,
  SPREADSHEET_FIELD_LABELS,
  validateMapping,
  type ColumnMapping,
  type SpreadsheetImportMode,
  type SpreadsheetParseResult,
  type SpreadsheetSheet,
  type SpreadsheetWorkbook,
} from '../../lib/spreadsheet-import';
import type { NapEntry, SleepEntry } from '../../types';

interface SleepSpreadsheetImportProps {
  onImport: (
    sleepEntries: Omit<SleepEntry, 'id' | 'createdAt'>[],
    napEntries: Omit<NapEntry, 'id' | 'createdAt'>[],
    mode: SpreadsheetImportMode
  ) => { success: boolean; error?: string; sleepCount: number; napCount: number };
  onMessage: (msg: string, isError?: boolean) => void;
}

const STEPS = ['Upload File', 'Match Columns', 'Preview', 'Import Options'] as const;

function statusColor(status: string): string {
  if (status === 'error') return '#ef4444';
  if (status === 'warning') return '#f59e0b';
  if (status === 'skipped') return 'var(--text-muted, #888)';
  return 'var(--text-heading)';
}

export function SleepSpreadsheetImport({ onImport, onMessage }: SleepSpreadsheetImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [parseResult, setParseResult] = useState<SpreadsheetParseResult | null>(null);
  const [mode, setMode] = useState<SpreadsheetImportMode>('merge');
  const [fileError, setFileError] = useState('');

  const activeSheet: SpreadsheetSheet | null = useMemo(() => {
    if (!workbook) return null;
    return workbook.sheets.find((s) => s.name === selectedSheet) ?? workbook.sheets[0] ?? null;
  }, [workbook, selectedSheet]);

  const reset = () => {
    setStep(0);
    setWorkbook(null);
    setSelectedSheet('');
    setMapping(null);
    setParseResult(null);
    setMode('merge');
    setFileError('');
    setConfirmOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');

    const result = await readSpreadsheetFile(file);
    if ('error' in result) {
      setFileError(result.error);
      onMessage(result.error, true);
      return;
    }

    setWorkbook(result);
    const first = result.sheets.find((s) => s.headers.length > 0) ?? result.sheets[0];
    setSelectedSheet(first.name);
    setMapping(autoDetectColumnMapping(first.headers));
    setStep(0);
    e.target.value = '';
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    const sheet = workbook?.sheets.find((s) => s.name === sheetName);
    if (sheet) {
      setMapping(autoDetectColumnMapping(sheet.headers));
    }
    setParseResult(null);
  };

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => {
      const base = prev ?? autoDetectColumnMapping(activeSheet?.headers ?? []);
      return { ...base, [field]: value || null };
    });
    setParseResult(null);
  };

  const runPreview = (): boolean => {
    if (!activeSheet || !mapping) return false;
    const validationError = validateMapping(mapping);
    if (validationError) {
      onMessage(validationError, true);
      return false;
    }
    const result = parseSpreadsheetRows(activeSheet.rows, mapping);
    setParseResult(result);
    return true;
  };

  const goNext = () => {
    if (step === 0) {
      if (!workbook || !activeSheet) {
        onMessage('Please upload a spreadsheet first.', true);
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      const validationError = validateMapping(mapping!);
      if (validationError) {
        onMessage(validationError, true);
        return;
      }
      if (runPreview()) setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const runImport = () => {
    if (!parseResult) return;
    if (parseResult.sleepCount === 0 && parseResult.napCount === 0) {
      onMessage('No sleep or nap entries to import.', true);
      return;
    }

    const result = onImport(parseResult.sleepEntries, parseResult.napEntries, mode);
    if (result.success) {
      onMessage(
        `Imported ${result.sleepCount} sleep ${result.sleepCount === 1 ? 'entry' : 'entries'} and ${result.napCount} nap ${result.napCount === 1 ? 'entry' : 'entries'}. A backup of your previous data was saved automatically.`
      );
      handleClose();
    } else {
      onMessage(result.error ?? 'Import failed.', true);
    }
  };

  const handleImportClick = () => {
    if (mode === 'replace') {
      setConfirmOpen(true);
    } else {
      runImport();
    }
  };

  const headers = activeSheet?.headers ?? [];

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Import Sleep Spreadsheet
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleFile}
      />

      <Modal
        open={open}
        onClose={handleClose}
        title="Import Sleep Spreadsheet"
        wide
        footer={
          <>
            {step > 0 && (
              <Button variant="secondary" onClick={goBack}>Back</Button>
            )}
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            {step < 3 ? (
              <Button onClick={goNext} disabled={step === 0 && !workbook}>
                Next
              </Button>
            ) : (
              <Button
                onClick={handleImportClick}
                disabled={!parseResult || (parseResult.sleepCount === 0 && parseResult.napCount === 0)}
              >
                Import
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5 text-left">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: i === step ? 'rgba(99,102,241,0.15)' : 'var(--bg)',
                  color: i === step ? 'var(--text-heading)' : 'var(--text-muted, #888)',
                  border: `1px solid ${i === step ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                }}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm opacity-70">
                Upload a .xlsx or .csv file with sleep and nap data for the Sleep Log.
                Expected columns include Date, Bedtime, Wake-Up, Nap Start, Nap End, and optional duration/notes fields.
              </p>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                {workbook ? 'Choose Different File' : 'Choose Spreadsheet'}
              </Button>
              {fileError && (
                <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {fileError}
                </div>
              )}
              {workbook && (
                <div
                  className="rounded-lg p-4 text-sm space-y-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <p><strong>File:</strong> {workbook.fileName}</p>
                  <p><strong>Sheets:</strong> {workbook.sheets.length}</p>
                  {workbook.sheets.length > 1 && (
                    <Select
                      label="Select Sheet"
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      options={workbook.sheets.map((s) => ({
                        value: s.name,
                        label: `${s.name} (${s.rows.length} rows)`,
                      }))}
                    />
                  )}
                  {activeSheet && (
                    <p className="opacity-70">
                      {activeSheet.headers.length} columns · {activeSheet.rows.length} data rows
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 1 && activeSheet && mapping && (
            <div className="space-y-4">
              <p className="text-sm opacity-70">
                Match spreadsheet columns to app fields. Auto-detected mappings are pre-filled.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {SPREADSHEET_FIELD_LABELS.map(({ key, label }) => (
                  <Select
                    key={key}
                    label={label}
                    value={mapping[key] ?? ''}
                    onChange={(e) => updateMapping(key, e.target.value)}
                    options={mappingOptions(headers)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && parseResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Sleep entries</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{parseResult.sleepCount}</p>
                </div>
                <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Nap entries</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{parseResult.napCount}</p>
                </div>
                <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Skipped rows</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{parseResult.skippedCount}</p>
                </div>
                <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Issues</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                    {parseResult.errors.length + parseResult.warnings.length}
                  </p>
                </div>
              </div>

              {(parseResult.errors.length > 0 || parseResult.warnings.length > 0) && (
                <div className="space-y-2 text-sm">
                  {parseResult.errors.slice(0, 5).map((err) => (
                    <p key={err} style={{ color: '#ef4444' }}>{err}</p>
                  ))}
                  {parseResult.warnings.slice(0, 5).map((warn) => (
                    <p key={warn} style={{ color: '#f59e0b' }}>{warn}</p>
                  ))}
                  {parseResult.errors.length + parseResult.warnings.length > 5 && (
                    <p className="opacity-60">…and more</p>
                  )}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs text-left">
                  <thead style={{ background: 'var(--bg)' }}>
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Sleep</th>
                      <th className="px-3 py-2 font-medium">Nap</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">Notes</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.previewRows.map((row) => (
                      <tr key={row.rowNumber} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.sleep}</td>
                        <td className="px-3 py-2">{row.nap}</td>
                        <td className="px-3 py-2 hidden sm:table-cell opacity-70">{row.notes}</td>
                        <td className="px-3 py-2" style={{ color: statusColor(row.status) }}>
                          {row.status}
                          {row.messages.length > 0 && (
                            <span className="block opacity-70">{row.messages.join('; ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && parseResult && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-4 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <p className="font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Ready to import</p>
                <p>{parseResult.sleepCount} sleep entries · {parseResult.napCount} nap entries</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Import Mode</p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="sheet-import-mode"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                    />
                    Merge with existing sleep data
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="sheet-import-mode"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                    />
                    Replace sleep data only
                  </label>
                </div>
                <p className="text-xs opacity-60 mt-2">
                  Replace overwrites sleep and nap entries in Sleep Log only. Friends, hangouts, and settings are not affected.
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Replace Sleep Log Data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirmOpen(false); runImport(); }}>
              Replace & Import
            </Button>
          </>
        }
      >
        <p className="text-sm">
          This will replace all existing sleep and nap entries in Sleep Log with the imported spreadsheet data.
        </p>
        <p className="text-sm opacity-70 mt-2">
          A backup of your current data will be saved automatically before importing.
        </p>
      </Modal>
    </>
  );
}
