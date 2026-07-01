import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLiveTimer } from '../../hooks/useLiveTimer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea } from '../ui/FormFields';
import { EmptyState } from '../ui/Misc';
import { calcDurationMinutes, formatDuration, formatDateTime, formatTime, toLocalISO } from '../../lib/dates';
import type { NapEntry } from '../../types';

export function NapsTab() {
  const { data, startNap, endNap, addNapEntry, updateNapEntry, deleteNapEntry } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<NapEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [endNotes, setEndNotes] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [form, setForm] = useState({ napStart: '', napEnd: '', notes: '' });

  const isNapping = !!data.activeTimers.napStart;
  const napElapsed = useLiveTimer(isNapping, data.activeTimers.napStart);

  const sorted = [...data.napEntries].sort(
    (a, b) => new Date(b.napStart).getTime() - new Date(a.napStart).getTime()
  );

  const openAdd = () => {
    setEditEntry(null);
    setForm({ napStart: toLocalISO(), napEnd: toLocalISO(), notes: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: NapEntry) => {
    setEditEntry(entry);
    setForm({ napStart: entry.napStart, napEnd: entry.napEnd, notes: entry.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editEntry) updateNapEntry(editEntry.id, form);
    else addNapEntry(form);
    setModalOpen(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {!isNapping ? (
          <Button onClick={startNap}>Start Nap</Button>
        ) : (
          <Button variant="success" onClick={() => setShowEndModal(true)}>End Nap</Button>
        )}
        <Button variant="secondary" onClick={openAdd}>Add Nap Entry</Button>
      </div>

      {isNapping && (
        <Card className="mb-6 border-nap/30 bg-nap/5">
          <p className="text-sm opacity-70">Napping since {formatDateTime(data.activeTimers.napStart!)}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-heading)' }}>
            {formatDuration(Math.floor(napElapsed / 60000))}
          </p>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState title="No naps logged" description="Start a nap or add a manual entry." action={<Button onClick={openAdd}>Add Nap Entry</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm text-left">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Notes</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3">{formatDateTime(entry.napStart)}</td>
                  <td className="px-4 py-3">{formatDateTime(entry.napEnd)}</td>
                  <td className="px-4 py-3 font-medium">{formatDuration(calcDurationMinutes(entry.napStart, entry.napEnd))}</td>
                  <td className="px-4 py-3 hidden sm:table-cell opacity-70 truncate max-w-[150px]">{entry.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(entry.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editEntry ? 'Edit Nap' : 'Add Nap'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></>}>
        <div className="space-y-4">
          <Input label="Nap Start" type="datetime-local" value={form.napStart} onChange={(e) => setForm({ ...form, napStart: e.target.value })} />
          <Input label="Nap End" type="datetime-local" value={form.napEnd} onChange={(e) => setForm({ ...form, napEnd: e.target.value })} />
          {form.napStart && form.napEnd && <p className="text-sm opacity-70">Duration: {formatDuration(calcDurationMinutes(form.napStart, form.napEnd))}</p>}
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal open={showEndModal} onClose={() => setShowEndModal(false)} title="End Nap"
        footer={<><Button variant="secondary" onClick={() => setShowEndModal(false)}>Cancel</Button><Button onClick={() => { endNap(endNotes); setEndNotes(''); setShowEndModal(false); }}>Confirm</Button></>}>
        <Textarea label="Notes (optional)" value={endNotes} onChange={(e) => setEndNotes(e.target.value)} />
        <p className="text-sm mt-2 opacity-70">End time: {formatTime(toLocalISO())}</p>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteNapEntry(deleteId)} title="Delete Nap" message="Delete this nap entry?" />
    </div>
  );
}
