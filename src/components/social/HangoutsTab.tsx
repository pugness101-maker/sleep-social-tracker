import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLiveTimer } from '../../hooks/useLiveTimer';
import { useHangoutFilters } from '../../hooks/useHangoutFilters';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { SearchBar, EmptyState } from '../ui/Misc';
import { calcDurationMinutes, formatDuration, formatDateTime, toLocalISO } from '../../lib/dates';
import type { Hangout, HangoutSegment } from '../../types';
import { getDefaultHangoutCategoryPair, isMixedHangoutCategory, normalizeHangoutMainFields } from '../../lib/hangout-categories';
import { filterHangoutsForTab } from '../../lib/hangout-filters';
import {
  formatHangoutSegmentTablePreviews,
  getHangoutTableCategory,
  getHangoutTableType,
} from '../../lib/hangout-segments';
import { HangoutSegmentEditor } from './HangoutSegmentEditor';
import { FriendPicker } from './FriendPicker';
import { HangoutCategoryTypeSelect } from './HangoutCategoryTypeSelect';
import { LocationAutocomplete } from './LocationAutocomplete';
import { IcsCalendarImport } from './IcsCalendarImport';

export function HangoutsTab() {
  const { data, startHangout, endHangout, addHangout, updateHangout, deleteHangout, duplicateHangout } = useApp();

  const {
    filters,
    setSearch,
    setCategory,
    setType,
    setLocation,
    categoryOptions,
    typeOptions,
  } = useHangoutFilters({
    hangoutCategories: data.hangoutCategories,
    hangoutTypesByCategory: data.hangoutTypesByCategory ?? {},
  });

  const makeEmptyForm = () => {
    const { category, type } = getDefaultHangoutCategoryPair(data.hangoutTypesByCategory ?? {});
    return {
      friendIds: [] as string[],
      startTime: toLocalISO(),
      endTime: toLocalISO(),
      location: '',
      category,
      type,
      notes: '',
      segments: [] as HangoutSegment[],
    };
  };

  const [form, setForm] = useState(makeEmptyForm);

  const [startForm, setStartForm] = useState(() => {
    const { category, type } = getDefaultHangoutCategoryPair(data.hangoutTypesByCategory ?? {});
    return { friendIds: [] as string[], category, type, location: '' };
  });

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

  const friendNameLookup = (id: string) => data.friends.find((f) => f.id === id)?.name ?? '?';

  const hangouts = useMemo(() => {
    const sorted = [...data.hangouts].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    return filterHangoutsForTab(sorted, data.friends, filters);
  }, [data.hangouts, data.friends, filters]);

  const friendNames = (ids: string[]) =>
    ids.map((id) => data.friends.find((f) => f.id === id)?.name ?? 'Unknown').join(', ') || 'No friends';

  const openAdd = () => {
    setEditHangout(null);
    setForm(makeEmptyForm());
    setModalOpen(true);
  };

  const openEdit = (h: Hangout) => {
    setEditHangout(h);
    setForm({
      friendIds: h.friendIds,
      startTime: h.startTime,
      endTime: h.endTime,
      location: h.location,
      category: h.category,
      type: h.type,
      notes: h.notes,
      segments: h.segments ?? [],
    });
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <SearchBar
            value={filters.search}
            onChange={setSearch}
            placeholder="Search friends, category, type, location, notes, date…"
          />
        </div>
        <Select
          label="Category"
          value={filters.category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: '', label: 'All Categories' }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          label="Type"
          value={filters.type}
          onChange={(e) => setType(e.target.value)}
          options={[{ value: '', label: 'All Types' }, ...typeOptions.map((t) => ({ value: t, label: t }))]}
        />
        <LocationAutocomplete
          label="Location"
          value={filters.location}
          onChange={setLocation}
          filterMode
          showFavorites={false}
        />
      </div>

      {hangouts.length === 0 ? (
        <EmptyState title="No hangouts logged" action={<Button onClick={openAdd}>Add Hangout</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3">Friends</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3 hidden md:table-cell">End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hangouts.map((h) => {
                const segmentPreviews = formatHangoutSegmentTablePreviews(h, friendNameLookup);
                return (
                  <tr key={h.id} className="border-t align-top" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                    <td className="px-4 py-3">{friendNames(h.friendIds)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(h.startTime)}</td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">{formatDateTime(h.endTime)}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatDuration(calcDurationMinutes(h.startTime, h.endTime))}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{getHangoutTableCategory(h)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-medium">{getHangoutTableType(h)}</span>
                      {isMixedHangoutCategory(h.category) && segmentPreviews.length > 0 && (
                        <ul className="text-xs opacity-70 mt-1.5 space-y-0.5 max-w-[280px]">
                          {segmentPreviews.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => duplicateHangout(h.id)}>Dup</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(h.id)}>Del</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Hangout"
        footer={<><Button variant="secondary" onClick={() => setStartModal(false)}>Cancel</Button><Button onClick={() => { startHangout(startForm.friendIds, startForm.category, startForm.type, startForm.location); setStartModal(false); }}>Start</Button></>}>
        <div className="space-y-4">
          <FriendPicker selected={startForm.friendIds} onChange={(ids) => setStartForm({ ...startForm, friendIds: ids })} />
          <HangoutCategoryTypeSelect
            category={startForm.category}
            type={startForm.type}
            onCategoryChange={(category) => {
              const main = normalizeHangoutMainFields(category, startForm.type);
              setStartForm({ ...startForm, category: main.category, type: main.type });
            }}
            onTypeChange={(type) => setStartForm({ ...startForm, type })}
          />
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
            <HangoutCategoryTypeSelect
              category={form.category}
              type={form.type}
              onCategoryChange={(category) => {
                const main = normalizeHangoutMainFields(category, form.type);
                setForm({ ...form, category: main.category, type: main.type });
              }}
              onTypeChange={(type) => setForm({ ...form, type })}
            />
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
            hangoutCategory={form.category}
            friends={data.friends}
            hangoutStart={form.startTime}
            hangoutEnd={form.endTime}
            onChange={(segments) => setForm({ ...form, segments })}
            onHangoutFriendsChange={(friendIds) => setForm({ ...form, friendIds })}
          />
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteHangout(deleteId)} title="Delete Hangout" message="Delete this hangout?" />
    </div>
  );
}
