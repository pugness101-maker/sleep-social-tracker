import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLiveTimer } from '../../hooks/useLiveTimer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea } from '../ui/FormFields';
import { EmptyState } from '../ui/Misc';
import { calcDurationMinutes, formatDuration, formatDateTime, formatTime, toLocalISO } from '../../lib/dates';
import { formatSleepDebt } from '../../lib/sleep-goals';
import { getEntrySleepDebt } from '../../lib/stats';
import type { SleepEntry } from '../../types';

export function SleepLogTab() {
  const {
    data,
    startSleep,
    wakeUp,
    addSleepEntry,
    updateSleepEntry,
    deleteSleepEntry,
    duplicateSleepEntry,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<SleepEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [wakeNotes, setWakeNotes] = useState('');
  const [showWakeModal, setShowWakeModal] = useState(false);

  const [form, setForm] = useState({ sleepStart: '', wakeUp: '', notes: '' });

  const isSleeping = !!data.activeTimers.sleepStart;
  const sleepElapsed = useLiveTimer(isSleeping, data.activeTimers.sleepStart);

  const sorted = [...data.sleepEntries].sort(
    (a, b) => new Date(b.sleepStart).getTime() - new Date(a.sleepStart).getTime()
  );

  const openAdd = () => {
    setEditEntry(null);
    setForm({ sleepStart: toLocalISO(), wakeUp: toLocalISO(), notes: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: SleepEntry) => {
    setEditEntry(entry);
    setForm({ sleepStart: entry.sleepStart, wakeUp: entry.wakeUp, notes: entry.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editEntry) {
      updateSleepEntry(editEntry.id, form);
    } else {
      addSleepEntry(form);
    }
    setModalOpen(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {!isSleeping ? (
          <Button onClick={startSleep}>Start Sleep</Button>
        ) : (
          <Button variant="success" onClick={() => setShowWakeModal(true)}>Wake Up</Button>
        )}
        <Button variant="secondary" onClick={openAdd}>Add Sleep Entry</Button>
      </div>

      {isSleeping && (
        <Card className="mb-6 border-sleep/30 bg-sleep/5">
          <p className="text-sm opacity-70">Currently sleeping since {formatDateTime(data.activeTimers.sleepStart!)}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-heading)' }}>
            {formatDuration(Math.floor(sleepElapsed / 60000))}
          </p>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState title="No sleep entries" description="Start sleep or add a manual entry to begin tracking." action={<Button onClick={openAdd}>Add Sleep Entry</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm text-left">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3 font-medium">Sleep Start</th>
                <th className="px-4 py-3 font-medium">Wake Up</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Debt / Surplus</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Notes</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3">{formatDateTime(entry.sleepStart)}</td>
                  <td className="px-4 py-3">{formatDateTime(entry.wakeUp)}</td>
                  <td className="px-4 py-3 font-medium">{formatDuration(calcDurationMinutes(entry.sleepStart, entry.wakeUp))}</td>
                  <td className="px-4 py-3">{formatSleepDebt(getEntrySleepDebt(data, entry))}</td>
                  <td className="px-4 py-3 hidden sm:table-cell opacity-70 truncate max-w-[150px]">{entry.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => duplicateSleepEntry(entry.id)}>Dup</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(entry.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editEntry ? 'Edit Sleep Entry' : 'Add Sleep Entry'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Sleep Start" type="datetime-local" value={form.sleepStart} onChange={(e) => setForm({ ...form, sleepStart: e.target.value })} />
          <Input label="Wake Up" type="datetime-local" value={form.wakeUp} onChange={(e) => setForm({ ...form, wakeUp: e.target.value })} />
          {form.sleepStart && form.wakeUp && (
            <p className="text-sm opacity-70">
              Duration: {formatDuration(calcDurationMinutes(form.sleepStart, form.wakeUp))}
              {' · '}
              {formatSleepDebt(
                data.settings.sleepGoalHours * 60 - calcDurationMinutes(form.sleepStart, form.wakeUp)
              )}
            </p>
          )}
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={showWakeModal}
        onClose={() => setShowWakeModal(false)}
        title="Wake Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowWakeModal(false)}>Cancel</Button>
            <Button onClick={() => { wakeUp(wakeNotes); setWakeNotes(''); setShowWakeModal(false); }}>Confirm Wake Up</Button>
          </>
        }
      >
        <Textarea label="Notes (optional)" value={wakeNotes} onChange={(e) => setWakeNotes(e.target.value)} />
        <p className="text-sm mt-2 opacity-70">Wake-up time: {formatTime(toLocalISO())}</p>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteSleepEntry(deleteId)}
        title="Delete Sleep Entry"
        message="Are you sure you want to delete this sleep entry?"
      />
    </div>
  );
}
