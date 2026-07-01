import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { SearchBar, EmptyState, Badge } from '../ui/Misc';
import { TagPicker } from '../ui/TagPicker';
import { enrichFriend } from '../../lib/stats';
import { formatDate, formatDuration } from '../../lib/dates';
import { friendMatchesTagFilter, friendMatchesGroupFilter, optionSelectOptions } from '../../lib/social-options';
import { formatLastSeenLabel, sortFriends, type FriendSortOption } from '../../lib/friend-activity';
import { FriendDetailModal } from './FriendDetailModal';
import type { Friend } from '../../types';
import { DEFAULT_RELATIONSHIP_STATUS } from '../../types';

export function FriendsTab() {
  const { data, addFriend, updateFriend, deleteFriend } = useApp();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<FriendSortOption>('name');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editFriend, setEditFriend] = useState<Friend | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailFriendId, setDetailFriendId] = useState<string | null>(null);

  const emptyForm = {
    name: '',
    tags: [] as string[],
    groups: [] as string[],
    relationshipStatus: DEFAULT_RELATIONSHIP_STATUS,
    relationships: [] as Friend['relationships'],
    birthday: '',
    contactInfo: '',
    notes: '',
    favoriteActivities: '',
  };
  const [form, setForm] = useState(emptyForm);

  const friends = useMemo(() => {
    let list = data.friends.map((f) => enrichFriend(f, data.hangouts));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.notes.toLowerCase().includes(q) ||
          f.contactInfo.toLowerCase().includes(q) ||
          f.relationshipStatus.toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filterTags.length > 0) {
      list = list.filter((f) => friendMatchesTagFilter(f, filterTags));
    }
    if (filterGroup) {
      list = list.filter((f) => friendMatchesGroupFilter(f, filterGroup));
    }
    if (filterStatus) {
      list = list.filter((f) => f.relationshipStatus === filterStatus);
    }
    list = sortFriends(list, sortBy);
    return list;
  }, [data.friends, data.hangouts, search, sortBy, filterTags, filterGroup, filterStatus]);

  const orphanTags = useMemo(() => {
    const known = new Set(data.friendTags);
    const extras = new Set<string>();
    data.friends.forEach((f) => f.tags.forEach((t) => { if (!known.has(t)) extras.add(t); }));
    return [...extras];
  }, [data.friends, data.friendTags]);

  const openAdd = () => {
    setEditFriend(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (friend: Friend) => {
    setEditFriend(friend);
    setForm({
      name: friend.name,
      tags: [...friend.tags],
      groups: [...(friend.groups ?? [])],
      relationshipStatus: friend.relationshipStatus || DEFAULT_RELATIONSHIP_STATUS,
      relationships: friend.relationships,
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
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search friends..." />
        </div>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as FriendSortOption)}
          options={[
            { value: 'name', label: 'Sort: Name' },
            { value: 'last_seen_newest', label: 'Sort: Last Seen (Newest)' },
            { value: 'last_seen_oldest', label: 'Sort: Last Seen (Oldest)' },
            { value: 'hangouts', label: 'Sort: Most Hangouts' },
            { value: 'hours', label: 'Sort: Most Hours' },
            { value: 'created_newest', label: 'Sort: Most Recent Added' },
            { value: 'birthday', label: 'Sort: Birthday' },
          ]}
        />
        <Select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          options={[{ value: '', label: 'All Groups' }, ...optionSelectOptions(data.friendGroups)]}
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            ...optionSelectOptions(data.relationshipStatuses),
          ]}
        />
        <Button onClick={openAdd}>Add Friend</Button>
      </div>

      <Card className="mb-4">
        <TagPicker
          label="Filter by tags"
          options={data.friendTags}
          selected={filterTags}
          onChange={setFilterTags}
          orphanTags={orphanTags}
        />
        {(filterTags.length > 0 || filterGroup || filterStatus) && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => { setFilterTags([]); setFilterGroup(''); setFilterStatus(''); }}
          >
            Clear filters
          </Button>
        )}
      </Card>

      {friends.length === 0 ? (
        <EmptyState
          title="No friends yet"
          description="Add friends to track hangouts and social time."
          action={<Button onClick={openAdd}>Add Friend</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((friend) => {
            const lastSeen = formatLastSeenLabel(friend.lastSeen);
            return (
            <Card key={friend.id}>
              <div className="text-left">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{friend.name}</h3>
                  {friend.relationshipStatus && friend.relationshipStatus !== 'None' && (
                    <Badge color="#f472b6">{friend.relationshipStatus}</Badge>
                  )}
                </div>
                <p className="text-xs opacity-70 mb-2">
                  Status: <span className="font-medium">{friend.relationshipStatus || 'None'}</span>
                </p>
                {friend.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {friend.tags.map((tag) => (
                      <Badge key={tag} color="#6366f1">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-60 mb-2">No tags</p>
                )}
                {friend.birthday && <p className="text-xs opacity-70 mb-1">🎂 {formatDate(friend.birthday)}</p>}
                {friend.contactInfo && <p className="text-xs opacity-70 mb-1">📞 {friend.contactInfo}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div><span className="opacity-60">Hangouts</span><p className="font-medium">{friend.totalHangouts}</p></div>
                  <div><span className="opacity-60">Hours</span><p className="font-medium">{friend.totalHours.toFixed(1)}h</p></div>
                  <div><span className="opacity-60">Avg Duration</span><p className="font-medium">{formatDuration(friend.avgDuration)}</p></div>
                  <div>
                    <span className="opacity-60">Last Seen</span>
                    {lastSeen.relative ? (
                      <>
                        <p className="font-medium">{lastSeen.relative}</p>
                        {lastSeen.absolute && <p className="opacity-70">{lastSeen.absolute}</p>}
                      </>
                    ) : (
                      <p className="font-medium">—</p>
                    )}
                  </div>
                </div>
                {friend.favoriteActivities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {friend.favoriteActivities.map((a) => <Badge key={a} color="#34d399">{a}</Badge>)}
                  </div>
                )}
                {friend.notes && <p className="text-xs opacity-70 mt-2 line-clamp-2">{friend.notes}</p>}
                {friend.relationships.length > 0 && (
                  <p className="text-xs opacity-70 mt-2">
                    {friend.relationships.length} linked relationship{friend.relationships.length !== 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => setDetailFriendId(friend.id)}>View</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(friend)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(friend.id)}>Delete</Button>
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
        title={editFriend ? 'Edit Friend' : 'Add Friend'}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select
            label="Relationship Status"
            value={form.relationshipStatus}
            onChange={(e) => setForm({ ...form, relationshipStatus: e.target.value })}
            options={optionSelectOptions(data.relationshipStatuses, form.relationshipStatus)}
          />
          <div className="sm:col-span-2">
            <TagPicker
              label="Friend Groups"
              options={data.friendGroups}
              selected={form.groups}
              onChange={(groups) => setForm({ ...form, groups })}
              orphanTags={form.groups.filter((g) => !data.friendGroups.includes(g))}
            />
          </div>
          <div className="sm:col-span-2">
            <TagPicker
              label="Friend Tags"
              options={data.friendTags}
              selected={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
              orphanTags={form.tags.filter((t) => !data.friendTags.includes(t))}
            />
          </div>
          <Input label="Birthday" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          <Input label="Contact Info" value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
          <div className="sm:col-span-2">
            <Input
              label="Favorite Activities (comma-separated)"
              value={form.favoriteActivities}
              onChange={(e) => setForm({ ...form, favoriteActivities: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <FriendDetailModal
        friendId={detailFriendId}
        onClose={() => setDetailFriendId(null)}
        onEdit={(friend) => openEdit(friend)}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteFriend(deleteId)}
        title="Delete Friend"
        message="Delete this friend? Hangouts will remain but lose this friend reference."
      />
    </div>
  );
}
