import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { SearchBar, EmptyState, Badge } from '../ui/Misc';
import { formatDuration, toLocalISO } from '../../lib/dates';
import { getActiveTypeOptions, getDefaultHangoutCategoryPair } from '../../lib/hangout-categories';
import { filterFriendsForPickerPool } from '../../lib/friend-archive';
import { DEFAULT_HANGOUT_OCCASION } from '../../types';
import {
  calcPlannedDurationMinutes,
  compareIdeasByPlannedDate,
  formatPlannedDateLabel,
  formatPlannedTimeRange,
  matchesIdeaScheduleFilter,
  plannedTimesToHangoutRange,
  type IdeaScheduleFilter,
  type IdeaSortOption,
} from '../../lib/idea-planned-time';
import { LocationAutocomplete } from './LocationAutocomplete';
import { HangoutCategoryTypeSelect } from './HangoutCategoryTypeSelect';
import type { HangoutIdea, CostLevel, IdeaStatus } from '../../types';

const costs: CostLevel[] = ['Free', '$', '$$', '$$$'];
const statuses: IdeaStatus[] = ['Want to Try', 'Planned', 'Completed', 'Archived'];

function formatIdeaDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  return formatDuration(minutes);
}

function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

interface IdeaFormState {
  title: string;
  category: string;
  type: string;
  occasion: string;
  estimatedCost: CostLevel;
  durationInput: string;
  durationManuallySet: boolean;
  plannedDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  location: string;
  status: IdeaStatus;
  friendIds: string[];
  notes: string;
  links: string;
}

function applyPlannedTimeDuration(prev: IdeaFormState, patch: Partial<IdeaFormState>): IdeaFormState {
  const merged = { ...prev, ...patch };
  if (merged.durationManuallySet) return merged;
  const mins = calcPlannedDurationMinutes(
    merged.plannedDate,
    merged.plannedStartTime,
    merged.plannedEndTime
  );
  if (mins != null) {
    return { ...merged, durationInput: String(mins) };
  }
  return merged;
}

export function IdeasTab() {
  const { data, addIdea, updateIdea, deleteIdea, toggleFavoriteIdea, archiveIdea, convertIdeaToHangout } = useApp();

  const makeEmptyForm = (): IdeaFormState => {
    const { category, type } = getDefaultHangoutCategoryPair(data.hangoutTypesByCategory ?? {});
    return {
      title: '',
      category,
      type,
      occasion: '',
      estimatedCost: 'Free',
      durationInput: '',
      durationManuallySet: false,
      plannedDate: '',
      plannedStartTime: '',
      plannedEndTime: '',
      location: '',
      status: 'Want to Try',
      friendIds: [],
      notes: '',
      links: '',
    };
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCost, setFilterCost] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<IdeaScheduleFilter>('');
  const [sortBy, setSortBy] = useState<IdeaSortOption>('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [convertModal, setConvertModal] = useState<HangoutIdea | null>(null);
  const [editIdea, setEditIdea] = useState<HangoutIdea | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(makeEmptyForm);

  const activeTypeFilterOptions = useMemo(
    () => getActiveTypeOptions(data.hangoutTypesByCategory ?? {}, data.hangoutCategories),
    [data.hangoutTypesByCategory, data.hangoutCategories]
  );

  useEffect(() => {
    if (filterType && !activeTypeFilterOptions.some((t) => t.toLowerCase() === filterType.toLowerCase())) {
      setFilterType('');
    }
  }, [activeTypeFilterOptions, filterType]);

  const [convertForm, setConvertForm] = useState({
    friendIds: [] as string[],
    startTime: toLocalISO(),
    endTime: toLocalISO(),
  });
  const [includeArchivedIdeas, setIncludeArchivedIdeas] = useState(false);

  const ideaFormFriends = useMemo(
    () => filterFriendsForPickerPool(data.friends, includeArchivedIdeas, form.friendIds),
    [data.friends, includeArchivedIdeas, form.friendIds]
  );

  const convertFormFriends = useMemo(
    () => filterFriendsForPickerPool(data.friends, includeArchivedIdeas, convertForm.friendIds),
    [data.friends, includeArchivedIdeas, convertForm.friendIds]
  );

  const ideas = useMemo(() => {
    let list = [...data.ideas];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.notes.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q) ||
          (i.occasion ?? '').toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    if (filterType) list = list.filter((i) => i.type === filterType);
    if (filterCost) list = list.filter((i) => i.estimatedCost === filterCost);
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (scheduleFilter) list = list.filter((i) => matchesIdeaScheduleFilter(i, scheduleFilter));
    list.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      if (sortBy === 'planned_date') return compareIdeasByPlannedDate(a, b);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [data.ideas, search, filterType, filterCost, filterStatus, scheduleFilter, sortBy]);

  const pickRandom = () => {
    const pool = ideas.filter((i) => i.status !== 'Archived' && i.status !== 'Completed');
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const duration = formatIdeaDuration(pick.estimatedDurationMinutes);
    alert(
      `🎲 Random idea: ${pick.title} (${pick.category} · ${pick.type}, ${pick.estimatedCost}${duration ? `, ${duration}` : ''})`
    );
  };

  const openAdd = () => {
    setEditIdea(null);
    setForm(makeEmptyForm());
    setModalOpen(true);
  };

  const openEdit = (idea: HangoutIdea) => {
    setEditIdea(idea);
    setForm({
      title: idea.title,
      category: idea.category,
      type: idea.type,
      occasion: idea.occasion && idea.occasion !== DEFAULT_HANGOUT_OCCASION ? idea.occasion : '',
      estimatedCost: idea.estimatedCost,
      durationInput:
        idea.estimatedDurationMinutes != null ? String(idea.estimatedDurationMinutes) : '',
      durationManuallySet: idea.estimatedDurationMinutes != null,
      plannedDate: idea.plannedDate ?? '',
      plannedStartTime: idea.plannedStartTime ?? '',
      plannedEndTime: idea.plannedEndTime ?? '',
      location: idea.location,
      status: idea.status,
      friendIds: idea.friendIds,
      notes: idea.notes,
      links: idea.links.join('\n'),
    });
    setModalOpen(true);
  };

  const openConvert = (idea: HangoutIdea) => {
    setConvertModal(idea);
    const planned = plannedTimesToHangoutRange(idea);
    if (planned) {
      setConvertForm({
        friendIds: [...idea.friendIds],
        startTime: planned.startTime,
        endTime: planned.endTime,
      });
      return;
    }
    const start = toLocalISO();
    let end = start;
    if (idea.estimatedDurationMinutes != null && idea.estimatedDurationMinutes > 0) {
      const endDate = new Date();
      endDate.setMinutes(endDate.getMinutes() + idea.estimatedDurationMinutes);
      end = toLocalISO(endDate);
    }
    setConvertForm({
      friendIds: [...idea.friendIds],
      startTime: start,
      endTime: end,
    });
  };

  const handleSave = () => {
    const plannedDate = form.plannedDate.trim() || undefined;
    const plannedStartTime = plannedDate && form.plannedStartTime.trim() ? form.plannedStartTime.trim() : undefined;
    const plannedEndTime = plannedDate && form.plannedEndTime.trim() ? form.plannedEndTime.trim() : undefined;

    let estimatedDurationMinutes = parseDurationInput(form.durationInput);
    if (!form.durationManuallySet && plannedStartTime && plannedEndTime) {
      estimatedDurationMinutes = calcPlannedDurationMinutes(plannedDate, plannedStartTime, plannedEndTime);
    }

    const payload = {
      title: form.title,
      category: form.category,
      type: form.type,
      occasion: form.occasion.trim() || undefined,
      estimatedCost: form.estimatedCost,
      estimatedDurationMinutes,
      plannedDate,
      plannedStartTime,
      plannedEndTime,
      location: form.location,
      status: form.status,
      friendIds: form.friendIds,
      notes: form.notes,
      links: form.links.split('\n').map((l) => l.trim()).filter(Boolean),
    };
    if (editIdea) updateIdea(editIdea.id, payload);
    else addIdea(payload);
    setModalOpen(false);
  };

  const toggleFriend = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];

  const friendNames = (ids: string[]) =>
    ids.map((id) => data.friends.find((f) => f.id === id)?.name).filter(Boolean).join(', ');

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={openAdd}>Add Idea</Button>
        <Button variant="secondary" onClick={pickRandom}>🎲 Random Idea</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[180px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search ideas..." />
        </div>
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          options={[
            { value: '', label: 'All Types' },
            ...activeTypeFilterOptions.map((t) => ({ value: t, label: t })),
          ]}
        />
        <Select
          value={filterCost}
          onChange={(e) => setFilterCost(e.target.value)}
          options={[{ value: '', label: 'All Costs' }, ...costs.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[{ value: '', label: 'All Statuses' }, ...statuses.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          value={scheduleFilter}
          onChange={(e) => setScheduleFilter(e.target.value as IdeaScheduleFilter)}
          options={[
            { value: '', label: 'All Ideas' },
            { value: 'unscheduled', label: 'Unscheduled' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'this_week', label: 'This Week' },
            { value: 'this_month', label: 'This Month' },
          ]}
        />
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as IdeaSortOption)}
          options={[
            { value: 'newest', label: 'Sort: Newest' },
            { value: 'planned_date', label: 'Sort: Planned Date' },
          ]}
        />
      </div>

      {ideas.length === 0 ? (
        <EmptyState
          title="No hangout ideas"
          description="Save ideas for future hangouts."
          action={<Button onClick={openAdd}>Add Idea</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const durationLabel = formatIdeaDuration(idea.estimatedDurationMinutes);
            const interested = friendNames(idea.friendIds);
            const plannedDateLabel = formatPlannedDateLabel(idea.plannedDate);
            const plannedTimeLabel = formatPlannedTimeRange(idea);
            return (
              <Card key={idea.id}>
                <div className="text-left space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {idea.isFavorite && '⭐ '}{idea.title}
                    </h3>
                    <Badge>{idea.status}</Badge>
                  </div>

                  {idea.occasion && idea.occasion !== DEFAULT_HANGOUT_OCCASION && (
                    <IdeaField label="Occasion" value={idea.occasion} />
                  )}
                  {plannedDateLabel && <IdeaField label="Planned" value={plannedDateLabel} />}
                  {plannedTimeLabel && <IdeaField label="Time" value={plannedTimeLabel} />}
                  <IdeaField label="Category" value={idea.category} />
                  <IdeaField label="Type" value={idea.type || '—'} />
                  <IdeaField label="Estimated Cost" value={idea.estimatedCost} />
                  {durationLabel && <IdeaField label="Estimated Duration" value={durationLabel} />}
                  {idea.location && <IdeaField label="Location" value={idea.location} />}
                  {interested && <IdeaField label="Interested Friends" value={interested} />}
                  {idea.notes && <IdeaField label="Notes" value={idea.notes} multiline />}

                  {idea.links.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {idea.links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary block truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => toggleFavoriteIdea(idea.id)}>
                      {idea.isFavorite ? 'Unfav' : 'Fav'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(idea)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => openConvert(idea)}>→ Hangout</Button>
                    {idea.status !== 'Archived' && (
                      <Button size="sm" variant="ghost" onClick={() => archiveIdea(idea.id)}>Archive</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(idea.id)}>Del</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIdea ? 'Edit Idea' : 'Add Idea'}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select
            label="Occasion (optional)"
            value={form.occasion}
            onChange={(e) => setForm({ ...form, occasion: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...data.hangoutOccasions
                .filter((o) => o !== DEFAULT_HANGOUT_OCCASION)
                .map((o) => ({ value: o, label: o })),
            ]}
          />
          <HangoutCategoryTypeSelect
            category={form.category}
            type={form.type}
            onMainFieldsChange={(category, type) => setForm((prev) => ({ ...prev, category, type }))}
          />
          <Select
            label="Estimated Cost"
            value={form.estimatedCost}
            onChange={(e) => setForm({ ...form, estimatedCost: e.target.value as CostLevel })}
            options={costs.map((c) => ({ value: c, label: c }))}
          />
          <Input
            label="Estimated Duration (minutes, optional)"
            type="number"
            min={1}
            placeholder="Leave blank if unknown"
            value={form.durationInput}
            onChange={(e) =>
              setForm({
                ...form,
                durationInput: e.target.value,
                durationManuallySet: e.target.value.trim() !== '',
              })
            }
          />
          <Input
            label="Planned Date (optional)"
            type="date"
            value={form.plannedDate}
            onChange={(e) =>
              setForm((prev) =>
                applyPlannedTimeDuration(prev, {
                  plannedDate: e.target.value,
                  ...(e.target.value ? {} : { plannedStartTime: '', plannedEndTime: '' }),
                })
              )
            }
          />
          <Input
            label="Planned Start Time (optional)"
            type="time"
            value={form.plannedStartTime}
            disabled={!form.plannedDate}
            onChange={(e) =>
              setForm((prev) => applyPlannedTimeDuration(prev, { plannedStartTime: e.target.value }))
            }
          />
          <Input
            label="Planned End Time (optional)"
            type="time"
            value={form.plannedEndTime}
            disabled={!form.plannedDate}
            onChange={(e) =>
              setForm((prev) => applyPlannedTimeDuration(prev, { plannedEndTime: e.target.value }))
            }
          />
          <LocationAutocomplete
            label="Location"
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
            placeholder="Search locations…"
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as IdeaStatus })}
            options={statuses.map((s) => ({ value: s, label: s }))}
          />
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="block text-sm font-medium text-left" style={{ color: 'var(--text-heading)' }}>
                Interested Friends
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeArchivedIdeas}
                  onChange={(e) => setIncludeArchivedIdeas(e.target.checked)}
                  className="rounded"
                />
                Include archived friends
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {ideaFormFriends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setForm({ ...form, friendIds: toggleFriend(form.friendIds, f.id) })}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${form.friendIds.includes(f.id) ? 'bg-primary text-white border-primary' : ''}`}
                  style={!form.friendIds.includes(f.id) ? { borderColor: 'var(--border)' } : undefined}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Links (one per line)" value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!convertModal}
        onClose={() => setConvertModal(null)}
        title="Convert to Hangout"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertModal(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (convertModal) {
                  convertIdeaToHangout(
                    convertModal.id,
                    convertForm.friendIds,
                    convertForm.startTime,
                    convertForm.endTime
                  );
                  setConvertModal(null);
                }
              }}
            >
              Convert
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70 text-left">
            Converting: <strong>{convertModal?.title}</strong>
            {convertModal?.category && <> · {convertModal.category} · {convertModal.type}</>}
          </p>
          {convertModal?.location && (
            <p className="text-sm opacity-70 text-left">📍 {convertModal.location}</p>
          )}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="block text-sm font-medium text-left" style={{ color: 'var(--text-heading)' }}>
                Friends
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeArchivedIdeas}
                  onChange={(e) => setIncludeArchivedIdeas(e.target.checked)}
                  className="rounded"
                />
                Include archived friends
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {convertFormFriends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setConvertForm({ ...convertForm, friendIds: toggleFriend(convertForm.friendIds, f.id) })
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm border ${convertForm.friendIds.includes(f.id) ? 'bg-primary text-white border-primary' : ''}`}
                  style={!convertForm.friendIds.includes(f.id) ? { borderColor: 'var(--border)' } : undefined}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Start"
              type="datetime-local"
              value={convertForm.startTime}
              onChange={(e) => setConvertForm({ ...convertForm, startTime: e.target.value })}
            />
            <Input
              label="End"
              type="datetime-local"
              value={convertForm.endTime}
              onChange={(e) => setConvertForm({ ...convertForm, endTime: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteIdea(deleteId)}
        title="Delete Idea"
        message="Delete this idea?"
      />
    </div>
  );
}

function IdeaField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="text-xs">
      <span className="opacity-60">{label}: </span>
      <span
        className={multiline ? 'opacity-80 line-clamp-3' : 'font-medium'}
        style={{ color: 'var(--text-heading)' }}
      >
        {value}
      </span>
    </div>
  );
}
