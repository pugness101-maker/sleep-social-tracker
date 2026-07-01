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
import { DEFAULT_HANGOUT_OCCASION } from '../../types';
import { getDefaultHangoutCategoryPair, hangoutMainFieldsForForm, isMixedHangoutCategory } from '../../lib/hangout-categories';
import { filterHangoutsForTab } from '../../lib/hangout-filters';
import { filterHangoutsByArchive } from '../../lib/hangout-bulk';
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
import { HangoutBulkEditModal } from './HangoutBulkEditModal';
import { HangoutBulkDuplicateModal } from './HangoutBulkDuplicateModal';
import { HangoutBulkToolbar, HangoutBulkUndoToast } from './HangoutBulkToolbar';
import type { BulkDuplicateTarget, HangoutBulkEditPatch } from '../../lib/hangout-bulk';

const SHOW_ARCHIVED_KEY = 'sleep-social-tracker-hangouts-show-archived';

function loadShowArchived(): boolean {
  try {
    return localStorage.getItem(SHOW_ARCHIVED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveShowArchived(value: boolean): void {
  localStorage.setItem(SHOW_ARCHIVED_KEY, String(value));
}

export function HangoutsTab() {
  const {
    data,
    startHangout,
    endHangout,
    addHangout,
    updateHangout,
    deleteHangout,
    duplicateHangout,
    bulkEditHangouts,
    bulkDuplicateHangouts,
    bulkArchiveHangouts,
    bulkDeleteHangouts,
    undoLastBulkHangout,
    canUndoBulkHangout,
  } = useApp();

  const {
    filters,
    setSearch,
    setOccasion,
    setCategory,
    setType,
    setLocation,
    categoryOptions,
    occasionOptions,
    typeOptions,
  } = useHangoutFilters({
    hangoutCategories: data.hangoutCategories,
    hangoutTypesByCategory: data.hangoutTypesByCategory ?? {},
    hangoutOccasions: data.hangoutOccasions ?? [],
  });

  const catalog = data.hangoutTypesByCategory ?? {};
  const settingsCategories = data.hangoutCategories ?? [];

  const [showArchived, setShowArchived] = useState(loadShowArchived);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDuplicateOpen, setBulkDuplicateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');

  const makeEmptyForm = () => {
    const { category, type } = getDefaultHangoutCategoryPair(catalog);
    return {
      friendIds: [] as string[],
      startTime: toLocalISO(),
      endTime: toLocalISO(),
      location: '',
      occasion: DEFAULT_HANGOUT_OCCASION,
      category,
      type,
      notes: '',
      segments: [] as HangoutSegment[],
    };
  };

  const applyFormMainFields = (category: string, type: string) => {
    setForm((prev) => ({ ...prev, category, type }));
  };

  const applyStartFormMainFields = (category: string, type: string) => {
    setStartForm((prev) => ({ ...prev, category, type }));
  };

  const [form, setForm] = useState(makeEmptyForm);

  const [startForm, setStartForm] = useState(() => {
    const { category, type } = getDefaultHangoutCategoryPair(catalog);
    return { friendIds: [] as string[], occasion: DEFAULT_HANGOUT_OCCASION, category, type, location: '' };
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
    const visible = filterHangoutsByArchive(sorted, showArchived);
    return filterHangoutsForTab(visible, data.friends, filters);
  }, [data.hangouts, data.friends, filters, showArchived]);

  const selectedCount = selectedIds.size;
  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

  const friendNames = (ids: string[]) =>
    ids.map((id) => data.friends.find((f) => f.id === id)?.name ?? 'Unknown').join(', ') || 'No friends';

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(hangouts.map((h) => h.id)));
  };

  const selectVisible = () => {
    setSelectedIds(new Set(hangouts.map((h) => h.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const showBulkSuccess = (message: string) => {
    setUndoMessage(message);
    clearSelection();
  };

  const handleBulkEdit = (patch: HangoutBulkEditPatch) => {
    const count = bulkEditHangouts(selectedIdList, patch);
    showBulkSuccess(`Updated ${count} hangout${count === 1 ? '' : 's'}`);
  };

  const handleBulkDuplicate = (target: BulkDuplicateTarget) => {
    const count = bulkDuplicateHangouts(selectedIdList, target);
    showBulkSuccess(`Duplicated ${count} hangout${count === 1 ? '' : 's'}`);
  };

  const handleBulkArchive = () => {
    const count = bulkArchiveHangouts(selectedIdList, true);
    showBulkSuccess(`Archived ${count} hangout${count === 1 ? '' : 's'}`);
  };

  const handleBulkDelete = () => {
    const count = bulkDeleteHangouts(selectedIdList);
    setBulkDeleteOpen(false);
    showBulkSuccess(`Deleted ${count} hangout${count === 1 ? '' : 's'}`);
  };

  const handleUndo = () => {
    if (undoLastBulkHangout()) {
      setUndoMessage('');
      setSelectedIds(new Set());
    }
  };

  const toggleShowArchived = (value: boolean) => {
    setShowArchived(value);
    saveShowArchived(value);
  };

  const openAdd = () => {
    setEditHangout(null);
    setForm(makeEmptyForm());
    setModalOpen(true);
  };

  const openEdit = (h: Hangout) => {
    setEditHangout(h);
    const main = hangoutMainFieldsForForm(h, catalog, settingsCategories);
    setForm({
      friendIds: h.friendIds,
      startTime: h.startTime,
      endTime: h.endTime,
      location: h.location,
      occasion: h.occasion || DEFAULT_HANGOUT_OCCASION,
      category: main.category,
      type: main.type,
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

      {undoMessage && canUndoBulkHangout() && (
        <HangoutBulkUndoToast
          message={undoMessage}
          onUndo={handleUndo}
          onDismiss={() => setUndoMessage('')}
        />
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {!isActive ? (
          <Button onClick={() => setStartModal(true)}>Start Hangout</Button>
        ) : (
          <Button variant="success" onClick={() => endHangout(endNotes)}>End Hangout</Button>
        )}
        <Button variant="secondary" onClick={openAdd}>Add Hangout</Button>
        <IcsCalendarImport triggerLabel="Import" onMessage={showImportMessage} />
        <Button
          variant={selectMode ? 'secondary' : 'ghost'}
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          {selectMode ? 'Exit Select Mode' : 'Select Mode'}
        </Button>
      </div>

      {selectMode && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant="secondary" onClick={selectAllFiltered}>
            Select All ({hangouts.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={selectVisible}>
            Select Visible
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} disabled={selectedCount === 0}>
            Clear Selection
          </Button>
        </div>
      )}

      {isActive && (
        <Card className="mb-4 border-social/30 bg-social/5">
          <p className="text-sm opacity-70 text-left">Hangout in progress with {friendNames(data.activeTimers.hangoutFriendIds)}</p>
          <p className="text-2xl font-bold mt-1 text-left" style={{ color: 'var(--text-heading)' }}>
            {formatDuration(Math.floor(hangoutElapsed / 60000))}
          </p>
          <Input className="mt-3" placeholder="Notes when ending..." value={endNotes} onChange={(e) => setEndNotes(e.target.value)} />
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="sm:col-span-2 lg:col-span-5">
          <SearchBar
            value={filters.search}
            onChange={setSearch}
            placeholder="Search friends, occasion, category, type, location, notes, date…"
          />
        </div>
        <Select
          label="Occasion"
          value={filters.occasion}
          onChange={(e) => setOccasion(e.target.value)}
          options={[{ value: '', label: 'All Occasions' }, ...occasionOptions.map((o) => ({ value: o, label: o }))]}
        />
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
        <Select
          label="Archive"
          value={showArchived ? 'show' : 'hide'}
          onChange={(e) => toggleShowArchived(e.target.value === 'show')}
          options={[
            { value: 'hide', label: 'Hide Archived' },
            { value: 'show', label: 'Show Archived' },
          ]}
        />
      </div>

      {hangouts.length === 0 ? (
        <EmptyState title="No hangouts logged" action={<Button onClick={openAdd}>Add Hangout</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm text-left min-w-[760px]">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                {selectMode && <th className="px-3 py-3 w-10" />}
                <th className="px-4 py-3">Friends</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3 hidden md:table-cell">End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 hidden sm:table-cell">Occasion</th>
                <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hangouts.map((h) => {
                const segmentPreviews = formatHangoutSegmentTablePreviews(h, friendNameLookup);
                const isSelected = selectedIds.has(h.id);
                return (
                  <tr
                    key={h.id}
                    className={`border-t align-top ${isSelected ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                    style={{ borderColor: 'var(--border)', background: h.isArchived ? 'var(--bg)' : 'var(--bg-card)' }}
                  >
                    {selectMode && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(h.id)}
                          aria-label={`Select hangout ${formatDateTime(h.startTime)}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {friendNames(h.friendIds)}
                      {h.isArchived && (
                        <span className="ml-2 text-xs opacity-60">(archived)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(h.startTime)}</td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">{formatDateTime(h.endTime)}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatDuration(calcDurationMinutes(h.startTime, h.endTime))}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{h.occasion || DEFAULT_HANGOUT_OCCASION}</td>
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
                      {!selectMode && (
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => duplicateHangout(h.id)}>Dup</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(h.id)}>Del</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <HangoutBulkToolbar
        selectedCount={selectedCount}
        onEdit={() => setBulkEditOpen(true)}
        onDuplicate={() => setBulkDuplicateOpen(true)}
        onArchive={handleBulkArchive}
        onDelete={() => setBulkDeleteOpen(true)}
        onCancel={exitSelectMode}
      />

      <HangoutBulkEditModal
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        onApply={handleBulkEdit}
        hangoutOccasions={data.hangoutOccasions}
        selectedCount={selectedCount}
      />

      <HangoutBulkDuplicateModal
        open={bulkDuplicateOpen}
        onClose={() => setBulkDuplicateOpen(false)}
        onConfirm={handleBulkDuplicate}
        selectedCount={selectedCount}
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedCount} hangout${selectedCount === 1 ? '' : 's'}?`}
        message="This cannot be undone."
      />

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Hangout"
        footer={<><Button variant="secondary" onClick={() => setStartModal(false)}>Cancel</Button><Button onClick={() => { startHangout(startForm.friendIds, startForm.category, startForm.type, startForm.location, startForm.occasion); setStartModal(false); }}>Start</Button></>}>
        <div className="space-y-4">
          <FriendPicker selected={startForm.friendIds} onChange={(ids) => setStartForm({ ...startForm, friendIds: ids })} />
          <Select
            label="Occasion"
            value={startForm.occasion}
            onChange={(e) => setStartForm({ ...startForm, occasion: e.target.value })}
            options={data.hangoutOccasions.map((o) => ({ value: o, label: o }))}
          />
          <HangoutCategoryTypeSelect
            category={startForm.category}
            type={startForm.type}
            onMainFieldsChange={applyStartFormMainFields}
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
          {form.startTime && form.endTime && (
            <p className="text-sm opacity-70">Duration: {formatDuration(calcDurationMinutes(form.startTime, form.endTime))}</p>
          )}
          <Select
            label="Occasion"
            value={form.occasion}
            onChange={(e) => setForm({ ...form, occasion: e.target.value })}
            options={data.hangoutOccasions.map((o) => ({ value: o, label: o }))}
          />
          <HangoutCategoryTypeSelect
            category={form.category}
            type={form.type}
            onMainFieldsChange={applyFormMainFields}
          />
          <LocationAutocomplete
            label="Location"
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
            placeholder="Search locations…"
          />
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
