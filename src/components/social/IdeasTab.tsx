import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { SearchBar, EmptyState, Badge } from '../ui/Misc';
import { formatDuration, toLocalISO } from '../../lib/dates';
import { getActiveTypeOptions, getDefaultHangoutCategoryPair } from '../../lib/hangout-categories';
import { LocationAutocomplete } from './LocationAutocomplete';
import { HangoutCategoryTypeSelect } from './HangoutCategoryTypeSelect';
import type { HangoutIdea, CostLevel, IdeaStatus } from '../../types';

const costs: CostLevel[] = ['Free', '$', '$$', '$$$'];
const statuses: IdeaStatus[] = ['Want to Try', 'Planned', 'Completed', 'Archived'];

export function IdeasTab() {
  const { data, addIdea, updateIdea, deleteIdea, toggleFavoriteIdea, archiveIdea, convertIdeaToHangout } = useApp();

  const makeEmptyForm = () => {
    const { category, type } = getDefaultHangoutCategoryPair(data.hangoutTypesByCategory ?? {});
    return {
      title: '',
      category,
      type,
      estimatedCost: 'Free' as CostLevel,
      estimatedDurationMinutes: 60,
      location: '',
      priority: 3,
      status: 'Want to Try' as IdeaStatus,
      friendIds: [] as string[],
      notes: '',
      links: '',
    };
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCost, setFilterCost] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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

  const ideas = useMemo(() => {
    let list = [...data.ideas];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.notes.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q)
      );
    }
    if (filterType) list = list.filter((i) => i.type === filterType);
    if (filterCost) list = list.filter((i) => i.estimatedCost === filterCost);
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    list.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.priority - a.priority;
    });
    return list;
  }, [data.ideas, search, filterType, filterCost, filterStatus]);

  const pickRandom = () => {
    const pool = ideas.filter((i) => i.status !== 'Archived' && i.status !== 'Completed');
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    alert(`🎲 Random idea: ${pick.title} (${pick.type}, ${pick.estimatedCost})`);
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
      estimatedCost: idea.estimatedCost,
      estimatedDurationMinutes: idea.estimatedDurationMinutes,
      location: idea.location,
      priority: idea.priority,
      status: idea.status,
      friendIds: idea.friendIds,
      notes: idea.notes,
      links: idea.links.join('\n'),
    });
    setModalOpen(true);
  };

  const openConvert = (idea: HangoutIdea) => {
    setConvertModal(idea);
    const end = new Date();
    end.setMinutes(end.getMinutes() + (idea.estimatedDurationMinutes || 60));
    setConvertForm({
      friendIds: [...idea.friendIds],
      startTime: toLocalISO(),
      endTime: toLocalISO(end),
    });
  };

  const handleSave = () => {
    const payload = { ...form, links: form.links.split('\n').map((l) => l.trim()).filter(Boolean) };
    if (editIdea) updateIdea(editIdea.id, payload);
    else addIdea(payload);
    setModalOpen(false);
  };

  const toggleFriend = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];

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
      </div>

      {ideas.length === 0 ? (
        <EmptyState
          title="No hangout ideas"
          description="Save ideas for future hangouts."
          action={<Button onClick={openAdd}>Add Idea</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <Card key={idea.id}>
              <div className="text-left">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                    {idea.isFavorite && '⭐ '}{idea.title}
                  </h3>
                  <Badge>{idea.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge color="#6366f1">{idea.type || 'Untyped'}</Badge>
                  <Badge color="#34d399">{idea.estimatedCost}</Badge>
                  <Badge color="#f59e0b">{formatDuration(idea.estimatedDurationMinutes)}</Badge>
                </div>
                {idea.location && <p className="text-xs opacity-70 mt-2">📍 {idea.location}</p>}
                <p className="text-xs opacity-70 mt-1">
                  Priority: {'★'.repeat(idea.priority)}{'☆'.repeat(5 - idea.priority)}
                </p>
                {idea.friendIds.length > 0 && (
                  <p className="text-xs opacity-70 mt-1">
                    👥 {idea.friendIds.map((id) => data.friends.find((f) => f.id === id)?.name).filter(Boolean).join(', ')}
                  </p>
                )}
                {idea.notes && <p className="text-xs opacity-70 mt-2 line-clamp-2">{idea.notes}</p>}
                {idea.links.length > 0 && (
                  <div className="mt-2 space-y-1">
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
                <div className="flex flex-wrap gap-1 mt-3">
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
          ))}
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
            label="Estimated Duration (minutes)"
            type="number"
            min={15}
            value={form.estimatedDurationMinutes}
            onChange={(e) => setForm({ ...form, estimatedDurationMinutes: parseInt(e.target.value) || 60 })}
          />
          <LocationAutocomplete
            label="Location"
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
            placeholder="Search locations…"
          />
          <Input
            label="Priority (1-5)"
            type="number"
            min={1}
            max={5}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 3 })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as IdeaStatus })}
            options={statuses.map((s) => ({ value: s, label: s }))}
          />
          <div className="sm:col-span-2">
            <span className="block text-sm font-medium mb-2 text-left" style={{ color: 'var(--text-heading)' }}>
              Friends Interested
            </span>
            <div className="flex flex-wrap gap-2">
              {data.friends.map((f) => (
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
            {convertModal?.type && <> · Type: {convertModal.type}</>}
          </p>
          {convertModal?.location && (
            <p className="text-sm opacity-70 text-left">📍 {convertModal.location}</p>
          )}
          <div>
            <span className="block text-sm font-medium mb-2 text-left" style={{ color: 'var(--text-heading)' }}>
              Friends
            </span>
            <div className="flex flex-wrap gap-2">
              {data.friends.map((f) => (
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
