import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  getImportPreview,
  getPresetLabel,
  IMPORT_PRESET_OPTIONS,
  type ImportMode,
  type ImportPreview,
  type ImportSectionPreset,
} from '../../lib/import-sections';

interface SectionImportProps {
  onImport: (json: string, preset: ImportSectionPreset, mode: ImportMode) => { success: boolean; error?: string };
  onMessage: (msg: string, isError?: boolean) => void;
}

export function SectionImport({ onImport, onMessage }: SectionImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [preset, setPreset] = useState<ImportSectionPreset>('sleep');
  const [mode, setMode] = useState<ImportMode>('merge');

  const reset = () => {
    setJson('');
    setPreview(null);
    setPreset('sleep');
    setMode('merge');
    setConfirmOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = getImportPreview(text);
      setJson(text);
      setPreview(result);
      if (!result.valid) {
        onMessage(result.error ?? 'Invalid backup file.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const runImport = () => {
    if (!json || !preview?.valid) return;
    const result = onImport(json, preset, mode);
    if (result.success) {
      const backupNote = ' A backup of your previous data was saved automatically.';
      onMessage(`"${getPresetLabel(preset)}" imported successfully (${mode}).${backupNote}`);
      handleClose();
    } else {
      onMessage(result.error ?? 'Import failed.', true);
    }
  };

  const handleImportClick = () => {
    if (!json || !preview?.valid) return;
    if (mode === 'replace') {
      setConfirmOpen(true);
    } else {
      runImport();
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Import Specific Sections
      </Button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />

      <Modal
        open={open}
        onClose={handleClose}
        title="Import Specific Sections"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleImportClick}
              disabled={!preview?.valid}
            >
              Import
            </Button>
          </>
        }
      >
        <div className="space-y-5 text-left">
          <div>
            <p className="text-sm opacity-70 mb-3">
              Choose a backup file, pick which sections to import, and select replace or merge mode.
            </p>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {preview?.valid ? 'Choose Different File' : 'Choose Backup File'}
            </Button>
          </div>

          {preview && !preview.valid && (
            <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {preview.error}
            </div>
          )}

          {preview?.valid && (
            <>
              <div
                className="rounded-lg p-4 text-sm space-y-1"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <p className="font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Backup Preview</p>
                {preview.exportedAt && (
                  <p className="opacity-70">Exported: {new Date(preview.exportedAt).toLocaleString()}</p>
                )}
                {preview.version !== undefined && (
                  <p className="opacity-70">Version: {preview.version}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2">
                  <p>Sleep entries: <strong>{preview.sleepEntries}</strong></p>
                  <p>Naps: <strong>{preview.napEntries}</strong></p>
                  <p>Friends: <strong>{preview.friends}</strong></p>
                  <p>Hangouts: <strong>{preview.hangouts}</strong></p>
                  <p>Ideas: <strong>{preview.ideas}</strong></p>
                  <p>Friend tags: <strong>{preview.friendTags}</strong></p>
                  <p>Relationship statuses: <strong>{preview.relationshipStatuses}</strong></p>
                  <p>Hangout types: <strong>{preview.hangoutTypes}</strong></p>
                  <p>Settings: <strong>{preview.hasSettings ? 'Yes' : 'No'}</strong></p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                  Sections to Import
                </p>
                <div className="space-y-2">
                  {IMPORT_PRESET_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer border"
                      style={{
                        borderColor: preset === option.id ? 'var(--color-social)' : 'var(--border)',
                        background: preset === option.id ? 'rgba(var(--social-rgb, 99, 102, 241), 0.08)' : 'var(--bg)',
                      }}
                    >
                      <input
                        type="radio"
                        name="import-preset"
                        checked={preset === option.id}
                        onChange={() => setPreset(option.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="text-sm font-medium block">{option.label}</span>
                        <span className="text-xs opacity-70">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                  Import Mode
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="import-mode"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                    />
                    Merge with current data
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="import-mode"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                    />
                    Replace current section
                  </label>
                </div>
                <p className="text-xs opacity-60 mt-2">
                  Merge matches items by ID — existing IDs are updated, new IDs are added.
                  Replace overwrites the selected section entirely.
                </p>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Replace Section Data?"
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
          This will <strong>replace</strong> your current <strong>{getPresetLabel(preset)}</strong> with the
          imported data. Your existing data in that section will be overwritten.
        </p>
        <p className="text-sm opacity-70 mt-2">
          A backup of your current data will be saved automatically before importing.
        </p>
      </Modal>
    </>
  );
}
