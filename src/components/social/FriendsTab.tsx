import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { SearchBar, EmptyState, Badge } from '../ui/Misc';
import { enrichFriend } from '../../lib/stats';
import { formatDate, formatDuration } from '../../lib/dates';
import type { Friend } from '../../types';
import { DEFAULT_FRIEND_CATEGORY } from '../../types';

export function FriendsTab() {
  const { data, addFriend, updateFriend, deleteFriend } = useApp();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editFriend, setEditFriend] = useState<Friend | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const defaultCategory = data.friendCategories.includes(DEFAULT_FRIEND_CATEGORY)
    ? DEFAULT_FRIEND_CATEGORY
    : data.friendCategories[0] ?? '';

  const emptyForm = { name: '', category: defaultCategory, birthday: '', contactInfo: '', notes: '', favoriteActivities: '' };
  const [form, setForm] = useState(emptyForm);

  const friends = useMemo(() => {
    let list = data.friends.map((f) => enrichFriend(f, data.hangouts));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.notes.toLowerCase().includes(q) ||
          f.contactInfo.toLowerCase().includes(q)
      );
    }
    if (filterCategory) list = list.filter((f) => f.category === filterCategory);
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'hangouts') return b.totalHangouts - a.totalHangouts;
      if (sortBy === 'hours') return b.totalHours - a.totalHours;
      if (sortBy === 'last') return (b.lastHangout ?? '').localeCompare(a.lastHangout ?? '');
      return 0;
    });
    return list;
  }, [data.friends, data.hangouts, search, sortBy, filterCategory]);

  const openAdd = () => {
    setEditFriend(null);
    setForm({
      name: '',
      category: data.friendCategories.includes(DEFAULT_FRIEND_CATEGORY)
        ? DEFAULT_FRIEND_CATEGORY
        : data.friendCategories[0] ?? '',
      birthday: '',
      contactInfo: '',
      notes: '',
      favoriteActivities: '',
    });
    setModalOpen(true);
  };

  const openEdit = (friend: Friend) => {
    setEditFriend(friend);
    setForm({
      name: friend.name,
      category: friend.category,
      birthday: friend.birthday,
      contactInfo: friend.contactInfo,
      notes: friend.notes,
      favoriteActivities: friend.favoriteActivities.join(', '),
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      favoriteActivities: form.favoriteActivities.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editFriend) updateFriend(editFriend.id, payload);
    else addFriend(payload);
    setModalOpen(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search friends..." /></div>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={[
          { value: 'name', label: 'Sort: Name' },
          { value: 'hangouts', label: 'Sort: Hangouts' },
          { value: 'hours', label: 'Sort: Hours' },
          { value: 'last', label: 'Sort: Last Hangout' },
        ]} />
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} options={[
          { value: '', label: 'All Categories' },
          ...data.friendCategories.map((c) => ({ value: c, label: c })),
        ]} />
        <Button onClick={openAdd}>Add Friend</Button>
      </div>

      {friends.length === 0 ? (
        <EmptyState title="No friends yet" description="Add friends to track hangouts and social time." action={<Button onClick={openAdd}>Add Friend</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((friend) => (
            <Card key={friend.id}>
              <div className="text-left">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{friend.name}</h3>
                  <Badge>{friend.category || 'Uncategorized'}</Badge>
                </div>
                {friend.birthday && <p className="text-xs opacity-70 mb-1">🎂 {formatDate(friend.birthday)}</p>}
                {friend.contactInfo && <p className="text-xs opacity-70 mb-1">📞 {friend.contactInfo}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div><span className="opacity-60">Hangouts</span><p className="font-medium">{friend.totalHangouts}</p></div>
                  <div><span className="opacity-60">Hours</span><p className="font-medium">{friend.totalHours.toFixed(1)}h</p></div>
                  <div><span className="opacity-60">Avg Duration</span><p className="font-medium">{formatDuration(friend.avgDuration)}</p></div>
                  <div><span className="opacity-60">Last Hangout</span><p className="font-medium">{friend.lastHangout ? formatDate(friend.lastHangout) : '—'}</p></div>
                </div>
                {friend.favoriteActivities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {friend.favoriteActivities.map((a) => <Badge key={a} color="#34d399">{a}</Badge>)}
                  </div>
                )}
                {friend.notes && <p className="text-xs opacity-70 mt-2 line-clamp-2">{friend.notes}</p>}
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(friend)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(friend.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editFriend ? 'Edit Friend' : 'Add Friend'} wide
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              ...(form.category && !data.friendCategories.includes(form.category)
                ? [{ value: form.category, label: form.category }]
                : []),
              ...data.friendCategories.map((c) => ({ value: c, label: c })),
            ]} />
          <Input label="Birthday" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          <Input label="Contact Info" value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Favorite Activities (comma-separated)" value={form.favoriteActivities} onChange={(e) => setForm({ ...form, favoriteActivities: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteFriend(deleteId)} title="Delete Friend" message="Delete this friend? Hangouts will remain but lose this friend reference." />
    </div>
  );
}
