import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLiveTimer } from '../../hooks/useLiveTimer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { SearchBar, EmptyState, Badge } from '../ui/Misc';
import { calcDurationMinutes, formatDuration, formatDateTime, toLocalISO } from '../../lib/dates';
import type { Hangout, HangoutSegment } from '../../types';
import { getDefaultHangoutType, hangoutTypeSelectOptions } from '../../lib/social-options';
import { getHangoutDisplayType, hangoutMatchesTypeFilter, formatSegmentSummary } from '../../lib/hangout-segments';
import { HangoutSegmentEditor } from './HangoutSegmentEditor';
import { FriendPicker } from './FriendPicker';
import { LocationAutocomplete } from './LocationAutocomplete';
import { IcsCalendarImport } from './IcsCalendarImport';

export function HangoutsTab() {
  const { data, startHangout, endHangout, addHangout, updateHangout, deleteHangout, duplicateHangout } = useApp();

  const defaultType = getDefaultHangoutType(data.hangoutTypes);

  const makeEmptyForm = () => ({
    friendIds: [] as string[],
    startTime: toLocalISO(),
    endTime: toLocalISO(),
    location: '',
    type: defaultType,
    notes: '',
    segments: [] as HangoutSegment[],
  });

  const [form, setForm] = useState(makeEmptyForm);

  const [startForm, setStartForm] = useState({
    friendIds: [] as string[],
    type: defaultType,
    location: '',
  });

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [startModal, setStartModal] = useState(false);
  const [editHangout, setEditHangout] = useState<Hangout | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [endNotes, setEndNotes] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [importMessageError, setImportMessageError] = useState(false);

  const showImportMessage = (msg: string, isError = false) => {
    setImportMessage(msg);
    setImportMessageError(isError);
    setTimeout(() => { setImportMessage(''); setImportMessageError(false); }, 4000);
  };

  const isActive = !!data.activeTimers.hangoutStart;
  const hangoutElapsed = useLiveTimer(isActive, data.activeTimers.hangoutStart);

  const hangouts = useMemo(() => {
    let list = [...data.hangouts].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((h) => {
        const names = h.friendIds.map((id) => data.friends.find((f) => f.id === id)?.name ?? '').join(' ');
        return names.toLowerCase().includes(q) || h.location.toLowerCase().includes(q) || h.notes.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || h.segments?.some((s) => s.type.toLowerCase().includes(q) || s.notes.toLowerCase().includes(q) || s.location.toLowerCase().includes(q));
      });
    }
    if (filterType) list = list.filter((h) => hangoutMatchesTypeFilter(h, filterType));
    if (filterLocation) {
      const loc = filterLocation.toLowerCase();
      list = list.filter(
        (h) =>
          h.location?.trim().toLowerCase() === loc ||
          h.segments?.some((s) => (s.location?.trim() || h.location?.trim() || '').toLowerCase() === loc)
      );
    }
    return list;
  }, [data.hangouts, data.friends, search, filterType, filterLocation]);

  const friendNames = (ids: string[]) =>
    ids.map((id) => data.friends.find((f) => f.id === id)?.name ?? 'Unknown').join(', ') || 'No friends';

  const openAdd = () => {
    setEditHangout(null);
    setForm(makeEmptyForm());
    setModalOpen(true);
  };

  const openEdit = (h: Hangout) => {
    setEditHangout(h);
    setForm({ friendIds: h.friendIds, startTime: h.startTime, endTime: h.endTime, location: h.location, type: h.type, notes: h.notes, segments: h.segments ?? [] });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editHangout) updateHangout(editHangout.id, form);
    else addHangout(form);
    setModalOpen(false);
  };

  return (
    <div>
      {importMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${importMessageError ? '' : 'bg-social/10 text-social'}`}
          style={importMessageError ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : undefined}
        >
          {importMessage}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {!isActive ? (
          <Button onClick={() => setStartModal(true)}>Start Hangout</Button>
        ) : (
          <Button variant="success" onClick={() => endHangout(endNotes)}>End Hangout</Button>
        )}
        <Button variant="secondary" onClick={openAdd}>Add Hangout</Button>
        <IcsCalendarImport triggerLabel="Import" onMessage={showImportMessage} />
      </div>

      {isActive && (
        <Card className="mb-4 border-social/30 bg-social/5">
          <p className="text-sm opacity-70 text-left">Hangout in progress with {friendNames(data.activeTimers.hangoutFriendIds)}</p>
          <p className="text-2xl font-bold mt-1 text-left" style={{ color: 'var(--text-heading)' }}>
            {formatDuration(Math.floor(hangoutElapsed / 60000))}
          </p>
          <Input className="mt-3" placeholder="Notes when ending..." value={endNotes} onChange={(e) => setEndNotes(e.target.value)} />
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search hangouts..." /></div>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} options={[
          { value: '', label: 'All Types' },
          ...data.hangoutTypes.map((t) => ({ value: t, label: t })),
        ]} />
        <div className="min-w-[200px] flex-1">
          <LocationAutocomplete
            label="Location"
            value={filterLocation}
            onChange={setFilterLocation}
            filterMode
            showFavorites={false}
          />
        </div>
      </div>

      {hangouts.length === 0 ? (
        <EmptyState title="No hangouts logged" action={<Button onClick={openAdd}>Add Hangout</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm text-left">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3">Friends</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3 hidden md:table-cell">End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hangouts.map((h) => (
                <tr key={h.id} className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <td className="px-4 py-3">{friendNames(h.friendIds)}</td>
                  <td className="px-4 py-3">{formatDateTime(h.startTime)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{formatDateTime(h.endTime)}</td>
                  <td className="px-4 py-3 font-medium">{formatDuration(calcDurationMinutes(h.startTime, h.endTime))}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge>{getHangoutDisplayType(h)}</Badge>
                    {h.segments?.length ? (
                      <p className="text-xs opacity-60 mt-1 max-w-[240px] truncate">
                        {formatSegmentSummary(h, (id) => data.friends.find((f) => f.id === id)?.name ?? '?')}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => duplicateHangout(h.id)}>Dup</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(h.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Hangout"
        footer={<><Button variant="secondary" onClick={() => setStartModal(false)}>Cancel</Button><Button onClick={() => { startHangout(startForm.friendIds, startForm.type, startForm.location); setStartModal(false); }}>Start</Button></>}>
        <div className="space-y-4">
          <FriendPicker selected={startForm.friendIds} onChange={(ids) => setStartForm({ ...startForm, friendIds: ids })} />
          <Select label="Type" value={startForm.type} onChange={(e) => setStartForm({ ...startForm, type: e.target.value })}
            options={hangoutTypeSelectOptions(data.hangoutTypes, startForm.type)} />
          <LocationAutocomplete
            label="Location"
            value={startForm.location}
            onChange={(location) => setStartForm({ ...startForm, location })}
            placeholder="Search locations…"
          />
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editHangout ? 'Edit Hangout' : 'Add Hangout'} wide
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></>}>
        <div className="space-y-4">
          <FriendPicker selected={form.friendIds} onChange={(ids) => setForm({ ...form, friendIds: ids })} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Start Time" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Input label="End Time" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          {form.startTime && form.endTime && <p className="text-sm opacity-70">Duration: {formatDuration(calcDurationMinutes(form.startTime, form.endTime))}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={hangoutTypeSelectOptions(data.hangoutTypes, form.type)} />
            <LocationAutocomplete
              label="Location"
              value={form.location}
              onChange={(location) => setForm({ ...form, location })}
              placeholder="Search locations…"
            />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <HangoutSegmentEditor
            segments={form.segments}
            hangoutFriendIds={form.friendIds}
            friends={data.friends}
            hangoutTypes={data.hangoutTypes}
            hangoutStart={form.startTime}
            hangoutEnd={form.endTime}
            defaultType={form.type}
            onChange={(segments) => setForm({ ...form, segments })}
            onHangoutFriendsChange={(friendIds) => setForm({ ...form, friendIds })}
          />
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteHangout(deleteId)} title="Delete Hangout" message="Delete this hangout?" />
    </div>
  );
}
