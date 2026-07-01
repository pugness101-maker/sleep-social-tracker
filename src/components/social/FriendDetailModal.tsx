import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, ConfirmModal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea, Select } from '../ui/FormFields';
import { SearchableFriendSelect } from './SearchableFriendSelect';
import { Badge } from '../ui/Misc';
import { formatDate, formatTime, formatDuration } from '../../lib/dates';
import { linkTypeOptions } from '../../lib/friend-links';
import { getDefaultRelationshipType } from '../../lib/social-options';
import { filterHangoutsByInsights } from '../../lib/insights-filters';
import { useInsightsFilters } from '../../hooks/useInsightsFilters';
import {
  getFriendDetailedStats,
  getFriendHangoutTimeline,
  formatLastSeenLabel,
  formatDaysSinceLabel,
  formatStreakLabel,
  formatMonthStreakLabel,
  formatGapDays,
} from '../../lib/friend-activity';
import { HangoutFormModal } from './HangoutFormModal';
import type { Friend, FriendLink } from '../../types';

interface FriendDetailModalProps {
  friendId: string | null;
  onClose: () => void;
  onEdit: (friend: Friend) => void;
}

export function FriendDetailModal({ friendId, onClose, onEdit }: FriendDetailModalProps) {
  const { data, addFriendLink, updateFriendLink, deleteFriendLink, archiveFriend, restoreFriend } = useApp();
  const { filters } = useInsightsFilters();
  const friend = data.friends.find((f) => f.id === friendId);
  const filteredHangouts = useMemo(
    () => filterHangoutsByInsights(data.hangouts, filters, data.friends),
    [data.hangouts, data.friends, filters]
  );
  const stats = friendId ? getFriendDetailedStats(friendId, filteredHangouts) : null;
  const timeline = friendId ? getFriendHangoutTimeline(friendId, filteredHangouts, data.friends) : [];

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editLink, setEditLink] = useState<FriendLink | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [editHangoutId, setEditHangoutId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const [linkForm, setLinkForm] = useState({
    relatedFriendId: '',
    type: getDefaultRelationshipType(data.relationshipTypes),
    notes: '',
  });

  const otherFriends = data.friends.filter((f) => f.id !== friendId && !f.isArchived);
  const friendName = (id: string) => data.friends.find((f) => f.id === id)?.name ?? 'Unknown';
  const lastSeenLabel = formatLastSeenLabel(stats?.lastSeen ?? null);

  const openAddLink = () => {
    setEditLink(null);
    setLinkForm({
      relatedFriendId: '',
      type: getDefaultRelationshipType(data.relationshipTypes),
      notes: '',
    });
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
            {friend.isArchived ? (
              <Button variant="secondary" onClick={() => setConfirmRestore(true)}>Restore</Button>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmArchive(true)}>Archive</Button>
            )}
            <Button onClick={() => { onEdit(friend); onClose(); }}>Edit Profile</Button>
          </>
        }
      >
        <div className="text-left space-y-5">
          <div>
            {friend.isArchived && (
              <div className="mb-2">
                <Badge color="#94a3b8">Archived</Badge>
              </div>
            )}
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
            {(friend.groups ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(friend.groups ?? []).map((group) => (
                  <Badge key={group} color="#14b8a6">{group}</Badge>
                ))}
              </div>
            )}
            {friend.birthday && <p className="text-sm opacity-70 mt-2">🎂 {formatDate(friend.birthday)}</p>}
            {friend.contactInfo && <p className="text-sm opacity-70">📞 {friend.contactInfo}</p>}
            {friend.notes && <p className="text-sm opacity-70 mt-2">{friend.notes}</p>}
            {lastSeenLabel.relative && (
              <div className="mt-3 text-sm">
                <p className="opacity-60">Last Seen</p>
                <p className="font-medium" style={{ color: 'var(--text-heading)' }}>{lastSeenLabel.relative}</p>
                {lastSeenLabel.absolute && <p className="text-xs opacity-70 mt-0.5">{lastSeenLabel.absolute}</p>}
              </div>
            )}
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Insights</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
              <div><span className="opacity-60 block">Most Common Hangout Type</span><span className="font-medium">{stats.mostCommonHangoutType ?? '—'}</span></div>
              <div><span className="opacity-60 block">Most Common Segment Type</span><span className="font-medium">{stats.mostCommonSegmentType ?? '—'}</span></div>
              <div><span className="opacity-60 block">Favorite Location</span><span className="font-medium">{stats.favoriteLocation ?? '—'}</span></div>
              <div><span className="opacity-60 block">Favorite Day of Week</span><span className="font-medium">{stats.mostSeenWeekday ?? '—'}</span></div>
              <div><span className="opacity-60 block">Most Common Time of Day</span><span className="font-medium">{stats.mostSeenTimeOfDay ?? '—'}</span></div>
              <div><span className="opacity-60 block">Total Hangouts</span><span className="font-medium">{stats.totalHangouts}</span></div>
              <div><span className="opacity-60 block">Total Hours</span><span className="font-medium">{stats.totalHours.toFixed(1)}h</span></div>
              <div><span className="opacity-60 block">Average Duration</span><span className="font-medium">{formatDuration(stats.avgDuration)}</span></div>
              <div><span className="opacity-60 block">Longest Hangout</span><span className="font-medium">{stats.totalHangouts ? formatDuration(stats.longestHangoutMinutes) : '—'}</span></div>
              <div><span className="opacity-60 block">Shortest Hangout</span><span className="font-medium">{stats.totalHangouts ? formatDuration(stats.shortestHangoutMinutes) : '—'}</span></div>
              <div><span className="opacity-60 block">First Seen</span><span className="font-medium">{stats.firstSeen ? formatDate(stats.firstSeen) : '—'}</span></div>
              <div><span className="opacity-60 block">Last Seen</span><span className="font-medium">{stats.lastSeen ? formatDate(stats.lastSeen) : '—'}</span></div>
              <div><span className="opacity-60 block">Days Since Seen</span><span className="font-medium">{formatDaysSinceLabel(stats.daysSinceSeen)}</span></div>
              <div><span className="opacity-60 block">Longest Gap</span><span className="font-medium">{formatGapDays(stats.longestGapDays)}</span></div>
              <div><span className="opacity-60 block">Weekly Streak</span><span className="font-medium">{formatStreakLabel(stats.hangoutStreakWeeks)}</span></div>
              <div><span className="opacity-60 block">Monthly Streak</span><span className="font-medium">{formatMonthStreakLabel(stats.hangoutStreakMonths)}</span></div>
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Recent Activity</h3>
            {timeline.length === 0 ? (
              <p className="text-sm opacity-70">No hangouts logged with {friend.name} yet.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.map((item) => (
                  <li key={item.segmentId ? `${item.hangoutId}-${item.segmentId}` : item.hangoutId}>
                    <button
                      type="button"
                      onClick={() => setEditHangoutId(item.hangoutId)}
                      className="w-full text-left p-3 rounded-lg border transition-colors hover:opacity-90"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm flex flex-wrap items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                            <span>{formatDate(item.date)} · {item.type}</span>
                            {item.kind === 'segment' && (
                              <span className="text-xs font-normal px-1.5 py-0.5 rounded opacity-70" style={{ background: 'var(--border)' }}>
                                Segment
                              </span>
                            )}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(item.startTime)} – {formatTime(item.endTime)}
                            {item.durationMinutes > 0 ? ` · ${formatDuration(item.durationMinutes)}` : ' · Activity only'}
                          </p>
                          {item.location && <p className="text-xs opacity-70 mt-1">📍 {item.location}</p>}
                          {item.otherFriends.length > 0 && (
                            <p className="text-xs opacity-70 mt-1">
                              Also with {item.otherFriends.map((f) => f.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs opacity-50 shrink-0">Edit</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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

      <HangoutFormModal
        hangoutId={editHangoutId}
        open={!!editHangoutId}
        onClose={() => setEditHangoutId(null)}
      />

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
          <SearchableFriendSelect
            label="Related Friend"
            value={linkForm.relatedFriendId}
            onChange={(relatedFriendId) => setLinkForm({ ...linkForm, relatedFriendId })}
            excludeFriendIds={friendId ? [friendId] : []}
          />
          <Select
            label="Relationship Type"
            value={linkForm.type}
            onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value })}
            options={linkTypeOptions(data.relationshipTypes, linkForm.type)}
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
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => {
          if (friendId) archiveFriend(friendId);
          setConfirmArchive(false);
          onClose();
        }}
        title="Archive Friend"
        message="Archive this friend? They will be hidden from default friend lists, but all past hangout data stays saved."
      />

      <ConfirmModal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={() => {
          if (friendId) restoreFriend(friendId);
          setConfirmRestore(false);
        }}
        title="Restore Friend"
        message="Restore this friend to your active friends list?"
      />

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
