import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/FormFields';
import { endOfDay } from 'date-fns';
import { formatDateTime, formatDuration } from '../../lib/dates';
import {
  buildDefaultFriendResolutions,
  buildIcsPreview,
  detectHangoutType,
  extractFriendNames,
  formatDateInputValue,
  getIcsDateRangePreset,
  ICS_DATE_PRESETS,
  isEventInRange,
  parseFlexibleDateInput,
  parseIcsFile,
  readIcsFile,
  type FriendResolution,
  type IcsDatePresetId,
  type IcsImportMode,
  type IcsImportOptions,
  type IcsPreviewItem,
  type ParsedIcsEvent,
} from '../../lib/ics-import';

const STEPS = [
  'Upload .ics',
  'Date Range',
  'Detect Hangouts',
  'Friend Matching',
  'Hangout Types',
  'Preview',
  'Import Options',
] as const;

interface IcsCalendarImportProps {
  triggerLabel?: string;
  onMessage: (msg: string, isError?: boolean) => void;
}

export function IcsCalendarImport({
  triggerLabel = 'Import Calendar (.ics)',
  onMessage,
}: IcsCalendarImportProps) {
  const { data, importIcsCalendar } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [events, setEvents] = useState<ParsedIcsEvent[]>([]);
  const [fileError, setFileError] = useState('');
  const [datePreset, setDatePreset] = useState<IcsDatePresetId>('30');
  const [rangeStart, setRangeStart] = useState(formatDateInputValue(getIcsDateRangePreset('30').start));
  const [rangeEnd, setRangeEnd] = useState(formatDateInputValue(getIcsDateRangePreset('30').end));
  const [friendResolutions, setFriendResolutions] = useState<Record<string, FriendResolution>>({});
  const [previewItems, setPreviewItems] = useState<IcsPreviewItem[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof buildIcsPreview>['stats'] | null>(null);
  const [includeAllDay, setIncludeAllDay] = useState(false);
  const [mode, setMode] = useState<IcsImportMode>('merge');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importLocation, setImportLocation] = useState(true);
  const [importDescription, setImportDescription] = useState(true);
  const [createMissingFriends, setCreateMissingFriends] = useState(true);

  const dateRange = useMemo(() => {
    const start = parseFlexibleDateInput(rangeStart);
    const end = parseFlexibleDateInput(rangeEnd);
    if (!start || !end) return null;
    return { start, end: endOfDay(end) };
  }, [rangeStart, rangeEnd]);

  const previewOptions = useMemo(
    () => ({ includeAllDay, importLocation, importDescription }),
    [includeAllDay, importLocation, importDescription]
  );

  const refreshPreview = useCallback(() => {
    if (!dateRange) return;
    const { items, stats: nextStats } = buildIcsPreview(
      events,
      dateRange,
      data.friends,
      data.hangouts,
      friendResolutions,
      previewOptions
    );
    setPreviewItems((prev) =>
      items.map((item) => {
        const existing = prev.find((p) => p.uid === item.uid);
        return {
          ...item,
          type: existing?.type ?? item.type,
          import: existing?.import ?? item.import,
        };
      })
    );
    setStats(nextStats);
  }, [events, dateRange, data.friends, data.hangouts, friendResolutions, previewOptions]);

  useEffect(() => {
    if (step >= 2 && dateRange) refreshPreview();
  }, [step, dateRange, refreshPreview]);

  const reset = () => {
    setStep(0);
    setFileName('');
    setEvents([]);
    setFileError('');
    setDatePreset('30');
    const preset = getIcsDateRangePreset('30');
    setRangeStart(formatDateInputValue(preset.start));
    setRangeEnd(formatDateInputValue(preset.end));
    setFriendResolutions({});
    setPreviewItems([]);
    setStats(null);
    setIncludeAllDay(false);
    setMode('merge');
    setSkipDuplicates(true);
    setImportLocation(true);
    setImportDescription(true);
    setCreateMissingFriends(true);
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
    const read = await readIcsFile(file);
    if ('error' in read) {
      setFileError(read.error);
      onMessage(read.error, true);
      return;
    }
    const parsed = parseIcsFile(read.text);
    if ('error' in parsed) {
      setFileError(parsed.error);
      onMessage(parsed.error, true);
      return;
    }
    setFileName(file.name);
    setEvents(parsed.events);
    e.target.value = '';
  };

  const applyPreset = (preset: IcsDatePresetId) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getIcsDateRangePreset(preset);
      setRangeStart(formatDateInputValue(range.start));
      setRangeEnd(formatDateInputValue(range.end));
    }
  };

  const initFriendResolutions = () => {
    if (!dateRange) return;
    const names = new Set<string>();
    events
      .filter((e) => !e.isCancelled && isEventInRange(e, dateRange))
      .forEach((e) => extractFriendNames(e.title).forEach((n) => names.add(n)));
    setFriendResolutions(buildDefaultFriendResolutions([...names], data.friends));
  };

  const goNext = () => {
    if (step === 0) {
      if (!events.length) {
        onMessage('Please upload a calendar file first.', true);
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!dateRange) {
        onMessage('Enter a valid start and end date.', true);
        return;
      }
      if (dateRange.start > dateRange.end) {
        onMessage('Start date must be before end date.', true);
        return;
      }
      initFriendResolutions();
      setStep(2);
      return;
    }

    if (step === 2) {
      initFriendResolutions();
      refreshPreview();
      setStep(3);
      return;
    }

    if (step === 3) {
      refreshPreview();
      setStep(4);
      return;
    }

    if (step === 4) {
      refreshPreview();
      setStep(5);
      return;
    }

    if (step === 5) {
      setStep(6);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const runImport = () => {
    const options: IcsImportOptions = {
      mode,
      skipDuplicates,
      importLocation,
      importDescription,
      createMissingFriends,
      includeAllDay,
    };
    const result = importIcsCalendar(previewItems, friendResolutions, options);
    if (result.success) {
      onMessage(
        `Imported ${result.hangoutsImported} hangout${result.hangoutsImported === 1 ? '' : 's'} and created ${result.friendsCreated} friend${result.friendsCreated === 1 ? '' : 's'}. A backup of your previous data was saved automatically.`
      );
      handleClose();
    } else {
      onMessage(result.error ?? 'Import failed.', true);
    }
  };

  const handleImportClick = () => {
    if (mode === 'replace') setConfirmOpen(true);
    else runImport();
  };

  const uniqueNames = stats?.uniqueNames ?? Object.keys(friendResolutions);

  const typeOptions = useMemo(() => {
    const types = new Set([...data.hangoutTypes, ...previewItems.map((i) => i.type)]);
    return [...types].map((t) => ({ value: t, label: t }));
  }, [data.hangoutTypes, previewItems]);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <input ref={fileRef} type="file" accept=".ics" className="hidden" onChange={handleFile} />

      <Modal
        open={open}
        onClose={handleClose}
        title="Import Calendar (.ics)"
        wide
        footer={
          <>
            {step > 0 && <Button variant="secondary" onClick={goBack}>Back</Button>}
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            {step < 6 ? (
              <Button onClick={goNext} disabled={step === 0 && !events.length}>
                Next
              </Button>
            ) : (
              <Button
                onClick={handleImportClick}
                disabled={!previewItems.some((i) => i.import)}
              >
                Import
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5 text-left">
          <div className="flex flex-wrap gap-1.5">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className="text-[10px] px-2 py-1 rounded-full"
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
                Upload a Google Calendar .ics export to import hangouts and friends from event titles
                like “Hang w/Knox,” “Date w/ Mariel,” or “Club w/Selvin & Helene.”
              </p>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                {events.length ? 'Choose Different File' : 'Choose .ics File'}
              </Button>
              {fileError && (
                <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {fileError}
                </div>
              )}
              {events.length > 0 && (
                <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p><strong>File:</strong> {fileName}</p>
                  <p><strong>Events found:</strong> {events.length}</p>
                  <p className="opacity-70">Cancelled events will be ignored.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm opacity-70">Only import events whose start date falls within this range.</p>
              <div className="flex flex-wrap gap-2">
                {ICS_DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className="px-3 py-1.5 rounded-lg text-sm border"
                    style={{
                      borderColor: datePreset === p.id ? 'var(--color-social)' : 'var(--border)',
                      background: datePreset === p.id ? 'rgba(99,102,241,0.1)' : 'var(--bg)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  placeholder="4/1/26 or 2026-07-01"
                  value={rangeStart}
                  onChange={(e) => { setRangeStart(e.target.value); setDatePreset('custom'); }}
                />
                <Input
                  label="End Date"
                  placeholder="07/01/2026"
                  value={rangeEnd}
                  onChange={(e) => { setRangeEnd(e.target.value); setDatePreset('custom'); }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAllDay}
                  onChange={(e) => setIncludeAllDay(e.target.checked)}
                />
                Include all-day events
              </label>
            </div>
          )}

          {step === 2 && stats && (
            <div className="space-y-4">
              <p className="text-sm opacity-70">
                Events matching hangout patterns (Hang w/, Date w/, Lunch w/, etc.) are detected.
                Obvious non-social events like Work, Therapy, and Commute are ignored.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Total in file</p>
                  <p className="text-xl font-bold">{stats.totalEvents}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">In date range</p>
                  <p className="text-xl font-bold">{stats.inRange}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Detected hangouts</p>
                  <p className="text-xl font-bold">{stats.detectedHangouts}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Ignored</p>
                  <p className="text-xl font-bold">{stats.ignoredEvents}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Unique friends</p>
                  <p className="text-xl font-bold">{stats.uniqueNames.length}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="opacity-70">Duplicates</p>
                  <p className="text-xl font-bold">{stats.duplicateCount}</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm opacity-70">Match detected names to existing friends or choose to create or ignore.</p>
              {uniqueNames.length === 0 ? (
                <p className="text-sm opacity-70">No friend names detected in hangout titles.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {uniqueNames.map((name) => {
                    const resolution = friendResolutions[name] ?? { action: 'create' as const };
                    return (
                      <div key={name} className="grid sm:grid-cols-2 gap-2 items-end p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <p className="font-medium text-sm">{name}</p>
                        <Select
                          value={
                            resolution.action === 'match'
                              ? `match:${resolution.friendId}`
                              : resolution.action
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'create' || val === 'ignore') {
                              setFriendResolutions({ ...friendResolutions, [name]: { action: val } });
                            } else if (val.startsWith('match:')) {
                              setFriendResolutions({
                                ...friendResolutions,
                                [name]: { action: 'match', friendId: val.slice(6) },
                              });
                            }
                          }}
                          options={[
                            { value: 'create', label: 'Create new friend' },
                            ...data.friends.map((f) => ({ value: `match:${f.id}`, label: `Match: ${f.name}` })),
                            { value: 'ignore', label: 'Ignore this person' },
                          ]}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm opacity-70">Hangout types are auto-detected from titles. Override if needed.</p>
              <div className="overflow-x-auto rounded-xl border max-h-72 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs text-left">
                  <thead style={{ background: 'var(--bg)' }}>
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Detected</th>
                      <th className="px-3 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.uid} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2">{item.title}</td>
                        <td className="px-3 py-2 opacity-70">{detectHangoutType(item.title)}</td>
                        <td className="px-3 py-2">
                          <select
                            className="rounded border px-2 py-1 text-xs w-full"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                            value={item.type}
                            onChange={(e) =>
                              setPreviewItems((items) =>
                                items.map((i) => (i.uid === item.uid ? { ...i, type: e.target.value } : i))
                              )
                            }
                          >
                            {typeOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <p>Detected: <strong>{stats.detectedHangouts}</strong></p>
                  <p>New friends: <strong>{stats.newFriendsCount}</strong></p>
                  <p>Duplicates: <strong>{stats.duplicateCount}</strong></p>
                  <p>Ignored: <strong>{stats.ignoredEvents}</strong></p>
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border max-h-80 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs text-left">
                  <thead style={{ background: 'var(--bg)' }}>
                    <tr>
                      <th className="px-2 py-2">Import</th>
                      <th className="px-2 py-2">Title</th>
                      <th className="px-2 py-2">Start</th>
                      <th className="px-2 py-2">Duration</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Friends</th>
                      <th className="px-2 py-2 hidden lg:table-cell">Location</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item) => (
                      <tr key={item.uid} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={item.import}
                            onChange={(e) =>
                              setPreviewItems((items) =>
                                items.map((i) => (i.uid === item.uid ? { ...i, import: e.target.checked } : i))
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-2">{item.title}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{formatDateTime(item.startTime)}</td>
                        <td className="px-2 py-2">{formatDuration(item.durationMinutes)}</td>
                        <td className="px-2 py-2">{item.type}</td>
                        <td className="px-2 py-2">{item.detectedNames.join(', ') || '—'}</td>
                        <td className="px-2 py-2 hidden lg:table-cell opacity-70 truncate max-w-[120px]">{item.location || '—'}</td>
                        <td className="px-2 py-2" style={{ color: item.isDuplicate ? '#f59e0b' : undefined }}>
                          {item.isDuplicate ? item.duplicateReason : 'New'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p className="font-medium mb-1">Ready to import</p>
                <p>{previewItems.filter((i) => i.import).length} hangouts selected</p>
              </div>
              <div className="space-y-3 text-sm">
                <p className="font-medium">Import Mode</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ics-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                  Merge with existing data
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ics-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                  Replace social data only (hangouts)
                </label>
              </div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                  Skip duplicates
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importLocation} onChange={(e) => setImportLocation(e.target.checked)} />
                  Import location
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importDescription} onChange={(e) => setImportDescription(e.target.checked)} />
                  Import description as notes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={createMissingFriends} onChange={(e) => setCreateMissingFriends(e.target.checked)} />
                  Create missing friends
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeAllDay} onChange={(e) => setIncludeAllDay(e.target.checked)} />
                  Include all-day events
                </label>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Replace Hangouts?"
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
          This will replace all existing hangouts with the imported calendar hangouts.
          Friends and other social data will be kept, with new friends created as needed.
        </p>
        <p className="text-sm opacity-70 mt-2">A backup of your current data will be saved automatically.</p>
      </Modal>
    </>
  );
}
