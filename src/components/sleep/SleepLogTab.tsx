import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLiveTimer } from '../../hooks/useLiveTimer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Select, Textarea } from '../ui/FormFields';
import { EmptyState, SearchBar } from '../ui/Misc';
import { calcDurationMinutes, formatDuration, formatDateTime, formatTime, toLocalISO } from '../../lib/dates';
import { formatSleepDebt } from '../../lib/sleep-goals';
import { getEntrySleepDebt } from '../../lib/stats';
import type { NapEntry, SleepEntry } from '../../types';

type EntryKind = 'sleep' | 'nap';
type SleepLogFilter = 'all' | 'sleep' | 'nap';

interface LogRow {
  kind: EntryKind;
  id: string;
  start: string;
  end: string;
  notes: string;
  sleepEntry?: SleepEntry;
  napEntry?: NapEntry;
}

const FILTER_OPTIONS: { id: SleepLogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'nap', label: 'Naps' },
];

function buildLogRows(sleepEntries: SleepEntry[], napEntries: NapEntry[]): LogRow[] {
  const sleepRows: LogRow[] = sleepEntries.map((entry) => ({
    kind: 'sleep',
    id: entry.id,
    start: entry.sleepStart,
    end: entry.wakeUp,
    notes: entry.notes,
    sleepEntry: entry,
  }));
  const napRows: LogRow[] = napEntries.map((entry) => ({
    kind: 'nap',
    id: entry.id,
    start: entry.napStart,
    end: entry.napEnd,
    notes: entry.notes,
    napEntry: entry,
  }));
  return [...sleepRows, ...napRows].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
  );
}

export function SleepLogTab() {
  const {
    data,
    startSleep,
    wakeUp,
    startNap,
    endNap,
    addSleepEntry,
    updateSleepEntry,
    deleteSleepEntry,
    duplicateSleepEntry,
    addNapEntry,
    updateNapEntry,
    deleteNapEntry,
    duplicateNapEntry,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editKind, setEditKind] = useState<EntryKind>('sleep');
  const [editSleep, setEditSleep] = useState<SleepEntry | null>(null);
  const [editNap, setEditNap] = useState<NapEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: EntryKind; id: string } | null>(null);
  const [wakeNotes, setWakeNotes] = useState('');
  const [showWakeModal, setShowWakeModal] = useState(false);
  const [endNotes, setEndNotes] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);

  const [sleepForm, setSleepForm] = useState({ sleepStart: '', wakeUp: '', notes: '' });
  const [napForm, setNapForm] = useState({ napStart: '', napEnd: '', notes: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SleepLogFilter>('all');

  const isSleeping = !!data.activeTimers.sleepStart;
  const isNapping = !!data.activeTimers.napStart;
  const sleepElapsed = useLiveTimer(isSleeping, data.activeTimers.sleepStart);
  const napElapsed = useLiveTimer(isNapping, data.activeTimers.napStart);

  const totalEntries = data.sleepEntries.length + data.napEntries.length;

  const rows = useMemo(() => {
    let list = buildLogRows(data.sleepEntries, data.napEntries);
    if (filter === 'sleep') list = list.filter((r) => r.kind === 'sleep');
    if (filter === 'nap') list = list.filter((r) => r.kind === 'nap');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (row) =>
          row.notes.toLowerCase().includes(q) ||
          row.kind.includes(q) ||
          formatDateTime(row.start).toLowerCase().includes(q) ||
          formatDateTime(row.end).toLowerCase().includes(q)
      );
    }
    return list;
  }, [data.sleepEntries, data.napEntries, filter, search]);

  const openAdd = (kind: EntryKind = 'sleep') => {
    setEditSleep(null);
    setEditNap(null);
    setEditKind(kind);
    const now = toLocalISO();
    setSleepForm({ sleepStart: now, wakeUp: now, notes: '' });
    setNapForm({ napStart: now, napEnd: now, notes: '' });
    setModalOpen(true);
  };

  const openEditSleep = (entry: SleepEntry) => {
    setEditSleep(entry);
    setEditNap(null);
    setEditKind('sleep');
    setSleepForm({ sleepStart: entry.sleepStart, wakeUp: entry.wakeUp, notes: entry.notes });
    setModalOpen(true);
  };

  const openEditNap = (entry: NapEntry) => {
    setEditNap(entry);
    setEditSleep(null);
    setEditKind('nap');
    setNapForm({ napStart: entry.napStart, napEnd: entry.napEnd, notes: entry.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editKind === 'sleep') {
      if (editSleep) updateSleepEntry(editSleep.id, sleepForm);
      else addSleepEntry(sleepForm);
    } else {
      if (editNap) updateNapEntry(editNap.id, napForm);
      else addNapEntry(napForm);
    }
    setModalOpen(false);
  };

  const isEditing = Boolean(editSleep || editNap);
  const modalTitle = isEditing
    ? editKind === 'sleep'
      ? 'Edit Sleep Entry'
      : 'Edit Nap Entry'
    : 'Add Entry';

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {!isSleeping ? (
          <Button onClick={startSleep}>Start Sleep</Button>
        ) : (
          <Button variant="success" onClick={() => setShowWakeModal(true)}>Wake Up</Button>
        )}
        {!isNapping ? (
          <Button onClick={startNap}>Start Nap</Button>
        ) : (
          <Button variant="success" onClick={() => setShowEndModal(true)}>End Nap</Button>
        )}
        <Button variant="secondary" onClick={() => openAdd('sleep')}>Add Entry</Button>
      </div>

      {isSleeping && (
        <Card className="mb-4 border-sleep/30 bg-sleep/5">
          <p className="text-sm opacity-70">Currently sleeping since {formatDateTime(data.activeTimers.sleepStart!)}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-heading)' }}>
            {formatDuration(Math.floor(sleepElapsed / 60000))}
          </p>
        </Card>
      )}

      {isNapping && (
        <Card className="mb-4 border-nap/30 bg-nap/5">
          <p className="text-sm opacity-70">Napping since {formatDateTime(data.activeTimers.napStart!)}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-heading)' }}>
            {formatDuration(Math.floor(napElapsed / 60000))}
          </p>
        </Card>
      )}

      {totalEntries > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search sleep and nap entries..." />
          <div className="flex rounded-lg border overflow-hidden text-sm shrink-0" style={{ borderColor: 'var(--border)' }}>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`px-3 py-1.5 transition-colors ${filter === opt.id ? 'bg-primary text-white' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={search || filter !== 'all' ? 'No matching entries' : 'No sleep log entries'}
          description={
            search || filter !== 'all'
              ? 'Try a different search or filter.'
              : 'Start sleep, start a nap, or add a manual entry to begin tracking.'
          }
          action={!search && filter === 'all' ? <Button onClick={() => openAdd('sleep')}>Add Entry</Button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm text-left">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Sleep Debt / Goal Result</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Notes</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const duration = calcDurationMinutes(row.start, row.end);
                return (
                  <tr
                    key={`${row.kind}:${row.id}`}
                    className="border-t"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          row.kind === 'sleep' ? 'bg-sleep/15 text-sleep' : 'bg-nap/15 text-nap'
                        }`}
                      >
                        {row.kind === 'sleep' ? 'Sleep' : 'Nap'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(row.start)}</td>
                    <td className="px-4 py-3">{formatDateTime(row.end)}</td>
                    <td className="px-4 py-3 font-medium">{formatDuration(duration)}</td>
                    <td className="px-4 py-3">
                      {row.kind === 'sleep' && row.sleepEntry
                        ? formatSleepDebt(getEntrySleepDebt(data, row.sleepEntry))
                        : '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell opacity-70 truncate max-w-[150px]">
                      {row.notes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            row.kind === 'sleep' && row.sleepEntry
                              ? openEditSleep(row.sleepEntry)
                              : row.napEntry && openEditNap(row.napEntry)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            row.kind === 'sleep'
                              ? duplicateSleepEntry(row.id)
                              : duplicateNapEntry(row.id)
                          }
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ kind: row.kind, id: row.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Entry Type"
            value={editKind}
            disabled={isEditing}
            options={[
              { value: 'sleep', label: 'Sleep' },
              { value: 'nap', label: 'Nap' },
            ]}
            onChange={(e) => setEditKind(e.target.value as EntryKind)}
          />

          {editKind === 'sleep' ? (
            <>
              <Input
                label="Sleep Start"
                type="datetime-local"
                value={sleepForm.sleepStart}
                onChange={(e) => setSleepForm({ ...sleepForm, sleepStart: e.target.value })}
              />
              <Input
                label="Wake Up"
                type="datetime-local"
                value={sleepForm.wakeUp}
                onChange={(e) => setSleepForm({ ...sleepForm, wakeUp: e.target.value })}
              />
              {sleepForm.sleepStart && sleepForm.wakeUp && (
                <p className="text-sm opacity-70">
                  Duration: {formatDuration(calcDurationMinutes(sleepForm.sleepStart, sleepForm.wakeUp))}
                  {' · '}
                  {formatSleepDebt(
                    data.settings.sleepGoalHours * 60 -
                      calcDurationMinutes(sleepForm.sleepStart, sleepForm.wakeUp)
                  )}
                </p>
              )}
              <Textarea
                label="Notes"
                value={sleepForm.notes}
                onChange={(e) => setSleepForm({ ...sleepForm, notes: e.target.value })}
              />
            </>
          ) : (
            <>
              <Input
                label="Nap Start"
                type="datetime-local"
                value={napForm.napStart}
                onChange={(e) => setNapForm({ ...napForm, napStart: e.target.value })}
              />
              <Input
                label="Nap End"
                type="datetime-local"
                value={napForm.napEnd}
                onChange={(e) => setNapForm({ ...napForm, napEnd: e.target.value })}
              />
              {napForm.napStart && napForm.napEnd && (
                <p className="text-sm opacity-70">
                  Duration: {formatDuration(calcDurationMinutes(napForm.napStart, napForm.napEnd))}
                </p>
              )}
              <Textarea
                label="Notes"
                value={napForm.notes}
                onChange={(e) => setNapForm({ ...napForm, notes: e.target.value })}
              />
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={showWakeModal}
        onClose={() => setShowWakeModal(false)}
        title="Wake Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowWakeModal(false)}>Cancel</Button>
            <Button
              onClick={() => {
                wakeUp(wakeNotes);
                setWakeNotes('');
                setShowWakeModal(false);
              }}
            >
              Confirm Wake Up
            </Button>
          </>
        }
      >
        <Textarea label="Notes (optional)" value={wakeNotes} onChange={(e) => setWakeNotes(e.target.value)} />
        <p className="text-sm mt-2 opacity-70">Wake-up time: {formatTime(toLocalISO())}</p>
      </Modal>

      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="End Nap"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEndModal(false)}>Cancel</Button>
            <Button
              onClick={() => {
                endNap(endNotes);
                setEndNotes('');
                setShowEndModal(false);
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Textarea label="Notes (optional)" value={endNotes} onChange={(e) => setEndNotes(e.target.value)} />
        <p className="text-sm mt-2 opacity-70">End time: {formatTime(toLocalISO())}</p>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === 'sleep') deleteSleepEntry(deleteTarget.id);
          else deleteNapEntry(deleteTarget.id);
        }}
        title={deleteTarget?.kind === 'nap' ? 'Delete Nap Entry' : 'Delete Sleep Entry'}
        message={`Are you sure you want to delete this ${deleteTarget?.kind === 'nap' ? 'nap' : 'sleep'} entry?`}
      />
    </div>
  );
}
