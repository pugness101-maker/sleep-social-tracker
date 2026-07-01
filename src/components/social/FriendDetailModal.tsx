import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea, Select } from '../ui/FormFields';
import { Badge } from '../ui/Misc';
import { enrichFriend } from '../../lib/stats';
import { formatDate, formatDuration } from '../../lib/dates';
import { linkTypeOptions } from '../../lib/friend-links';
import type { Friend, FriendLink } from '../../types';

interface FriendDetailModalProps {
  friendId: string | null;
  onClose: () => void;
  onEdit: (friend: Friend) => void;
}

export function FriendDetailModal({ friendId, onClose, onEdit }: FriendDetailModalProps) {
  const { data, addFriendLink, updateFriendLink, deleteFriendLink } = useApp();
  const friend = data.friends.find((f) => f.id === friendId);
  const stats = friend ? enrichFriend(friend, data.hangouts) : null;

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editLink, setEditLink] = useState<FriendLink | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [linkForm, setLinkForm] = useState({
    relatedFriendId: '',
    type: 'Friend',
    notes: '',
  });

  const otherFriends = data.friends.filter((f) => f.id !== friendId);

  const friendName = (id: string) => data.friends.find((f) => f.id === id)?.name ?? 'Unknown';

  const openAddLink = () => {
    setEditLink(null);
    setLinkForm({ relatedFriendId: otherFriends[0]?.id ?? '', type: 'Friend', notes: '' });
    setError('');
    setLinkModalOpen(true);
  };

  const openEditLink = (link: FriendLink) => {
    setEditLink(link);
    setLinkForm({ relatedFriendId: link.relatedFriendId, type: link.type, notes: link.notes });
    setError('');
    setLinkModalOpen(true);
  };

  const handleSaveLink = () => {
    if (!friendId || !linkForm.relatedFriendId) {
      setError('Please select a related friend.');
      return;
    }
    const err = editLink
      ? updateFriendLink(friendId, editLink.id, linkForm)
      : addFriendLink(friendId, linkForm.relatedFriendId, linkForm.type, linkForm.notes);
    if (err) {
      setError(err);
      return;
    }
    setLinkModalOpen(false);
  };

  if (!friend || !stats) return null;

  return (
    <>
      <Modal
        open={!!friendId}
        onClose={onClose}
        title={friend.name}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button onClick={() => { onEdit(friend); onClose(); }}>Edit Profile</Button>
          </>
        }
      >
        <div className="text-left space-y-5">
          <div>
            <p className="text-sm opacity-70">
              Status: <span className="font-medium">{friend.relationshipStatus || 'None'}</span>
            </p>
            {friend.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {friend.tags.map((tag) => (
                  <Badge key={tag} color="#6366f1">{tag}</Badge>
                ))}
              </div>
            )}
            {friend.birthday && <p className="text-sm opacity-70 mt-2">🎂 {formatDate(friend.birthday)}</p>}
            {friend.contactInfo && <p className="text-sm opacity-70">📞 {friend.contactInfo}</p>}
            {friend.notes && <p className="text-sm opacity-70 mt-2">{friend.notes}</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="opacity-60 block">Hangouts</span><span className="font-medium">{stats.totalHangouts}</span></div>
            <div><span className="opacity-60 block">Hours</span><span className="font-medium">{stats.totalHours.toFixed(1)}h</span></div>
            <div><span className="opacity-60 block">Avg Duration</span><span className="font-medium">{formatDuration(stats.avgDuration)}</span></div>
            <div><span className="opacity-60 block">Last Hangout</span><span className="font-medium">{stats.lastHangout ? formatDate(stats.lastHangout) : '—'}</span></div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>Relationships</h3>
              <Button size="sm" onClick={openAddLink} disabled={otherFriends.length === 0}>
                Add Relationship
              </Button>
            </div>
            <p className="text-xs opacity-60 mb-3">
              How {friend.name} is connected to other people in your friends list. Links are kept in sync both ways.
            </p>

            {otherFriends.length === 0 ? (
              <p className="text-sm opacity-70">Add more friends to create linked relationships.</p>
            ) : friend.relationships.length === 0 ? (
              <p className="text-sm opacity-70">No linked relationships yet.</p>
            ) : (
              <ul className="space-y-2">
                {friend.relationships.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                        {friend.name} → <Badge color="#818cf8">{link.type}</Badge> → {friendName(link.relatedFriendId)}
                      </p>
                      {link.notes && <p className="text-xs opacity-70 mt-1">{link.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditLink(link)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteLinkId(link.id)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title={editLink ? 'Edit Relationship' : 'Add Relationship'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLink}>Save</Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <Select
            label="Related Friend"
            value={linkForm.relatedFriendId}
            onChange={(e) => setLinkForm({ ...linkForm, relatedFriendId: e.target.value })}
            options={otherFriends.map((f) => ({ value: f.id, label: f.name }))}
          />
          <Select
            label="Relationship Type"
            value={linkForm.type}
            onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value })}
            options={linkTypeOptions(linkForm.type)}
          />
          <Textarea
            label="Notes (optional)"
            value={linkForm.notes}
            onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteLinkId}
        onClose={() => setDeleteLinkId(null)}
        onConfirm={() => {
          if (friendId && deleteLinkId) deleteFriendLink(friendId, deleteLinkId);
        }}
        title="Delete Relationship"
        message="Remove this linked relationship? The reciprocal link on the other friend's profile will also be removed."
      />
    </>
  );
}
