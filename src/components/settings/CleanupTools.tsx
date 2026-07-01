import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/FormFields';
import { ConfirmModal } from '../ui/Modal';
import { HangoutCategoryTypeSelect } from '../social/HangoutCategoryTypeSelect';
import { LocationAutocomplete } from '../social/LocationAutocomplete';

interface CleanupToolsProps {
  onMessage: (msg: string, isError?: boolean) => void;
}

export function CleanupTools({ onMessage }: CleanupToolsProps) {
  const {
    data,
    getCleanupPreview,
    runCleanupMergeFriends,
    runCleanupRenameFriend,
    runCleanupDeleteFriends,
    runCleanupDeleteHangouts,
    runCleanupBulkCategoryType,
    runCleanupBulkLocations,
    runCleanupNormalizeNames,
  } = useApp();

  const preview = useMemo(() => getCleanupPreview(), [getCleanupPreview, data]);

  const [primaryId, setPrimaryId] = useState('');
  const [mergeGroup, setMergeGroup] = useState<string>('');
  const [renameFriendId, setRenameFriendId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [bulkHangoutIds, setBulkHangoutIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState(data.hangoutCategories[0] ?? 'Other');
  const [bulkType, setBulkType] = useState('Other');
  const [bulkLocation, setBulkLocation] = useState('');
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [confirmDeleteFriends, setConfirmDeleteFriends] = useState<string[] | null>(null);
  const [confirmDeleteHangouts, setConfirmDeleteHangouts] = useState<string[] | null>(null);

  const selectedMergeGroup = preview.duplicateFriends.find((g) => g.normalizedName === mergeGroup);

  const duplicateIdsToMerge = selectedMergeGroup
    ? selectedMergeGroup.friends.filter((f) => f.id !== primaryId).map((f) => f.id)
    : [];

  return (
    <div className="space-y-4 text-left">
      <p className="text-sm opacity-70">All cleanup actions create an automatic backup first. Use Undo Last Cleanup in Backup & Restore if needed.</p>

      <Card className="!p-4 space-y-3">
        <h3 className="font-medium" style={{ color: 'var(--text-heading)' }}>Merge Duplicate Friends</h3>
        {preview.duplicateFriends.length === 0 ? (
          <p className="text-sm opacity-70">No duplicate friend names found.</p>
        ) : (
          <>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
              value={mergeGroup}
              onChange={(e) => {
                setMergeGroup(e.target.value);
                const group = preview.duplicateFriends.find((g) => g.normalizedName === e.target.value);
                setPrimaryId(group?.friends[0]?.id ?? '');
              }}
            >
              <option value="">Select duplicate group…</option>
              {preview.duplicateFriends.map((g) => (
                <option key={g.normalizedName} value={g.normalizedName}>
                  {g.friends.map((f) => f.name).join(' / ')} ({g.friends.length})
                </option>
              ))}
            </select>
            {selectedMergeGroup && (
              <>
                <label className="text-sm">Primary friend</label>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  value={primaryId}
                  onChange={(e) => setPrimaryId(e.target.value)}
                >
                  {selectedMergeGroup.friends.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <p className="text-xs opacity-70">
                  Will merge {duplicateIdsToMerge.length} duplicate(s) into primary and move hangouts, ideas, and relationships.
                </p>
                <Button size="sm" disabled={!primaryId || duplicateIdsToMerge.length === 0} onClick={() => setConfirmMerge(true)}>
                  Merge Duplicates
                </Button>
              </>
            )}
          </>
        )}
      </Card>

      <Card className="!p-4 space-y-3">
        <h3 className="font-medium" style={{ color: 'var(--text-heading)' }}>Rename Friend</h3>
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          value={renameFriendId}
          onChange={(e) => setRenameFriendId(e.target.value)}
        >
          <option value="">Select friend…</option>
          {data.friends.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <Input label="New name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
        <Button size="sm" disabled={!renameFriendId || !renameValue.trim()} onClick={() => {
          runCleanupRenameFriend(renameFriendId, renameValue);
          onMessage(`Renamed friend to "${renameValue.trim()}".`);
          setRenameValue('');
        }}>Rename</Button>
      </Card>

      <Card className="!p-4 space-y-3">
        <h3 className="font-medium" style={{ color: 'var(--text-heading)' }}>Duplicate Hangouts</h3>
        {preview.duplicateHangouts.length === 0 ? (
          <p className="text-sm opacity-70">No duplicate hangouts detected.</p>
        ) : (
          preview.duplicateHangouts.map((group) => (
            <div key={group.key} className="border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-2">{group.hangouts.length} matching hangouts</p>
              <ul className="text-xs opacity-70 space-y-1 mb-2">
                {group.hangouts.map((h) => (
                  <li key={h.id}>{h.startTime} – {h.endTime} ({h.friendIds.length} friends)</li>
                ))}
              </ul>
              <Button size="sm" variant="danger" onClick={() => setConfirmDeleteHangouts(group.hangouts.slice(1).map((h) => h.id))}>
                Delete duplicates (keep oldest)
              </Button>
            </div>
          ))
        )}
      </Card>

      <Card className="!p-4 space-y-3">
        <h3 className="font-medium" style={{ color: 'var(--text-heading)' }}>Bulk Edit Hangouts</h3>
        <select
          multiple
          className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px]"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          value={bulkHangoutIds}
          onChange={(e) => setBulkHangoutIds([...e.target.selectedOptions].map((o) => o.value))}
        >
          {data.hangouts.map((h) => (
            <option key={h.id} value={h.id}>{h.startTime.slice(0, 16)} · {h.category} · {h.type}</option>
          ))}
        </select>
        <HangoutCategoryTypeSelect
          category={bulkCategory}
          type={bulkType}
          onCategoryChange={setBulkCategory}
          onTypeChange={setBulkType}
        />
        <Button size="sm" disabled={bulkHangoutIds.length === 0} onClick={() => {
          runCleanupBulkCategoryType(bulkHangoutIds, bulkCategory, bulkType);
          onMessage(`Updated category/type on ${bulkHangoutIds.length} hangout(s).`);
        }}>Apply Category & Type</Button>
        <LocationAutocomplete label="Bulk location" value={bulkLocation} onChange={setBulkLocation} />
        <Button size="sm" disabled={bulkHangoutIds.length === 0 || !bulkLocation.trim()} onClick={() => {
          runCleanupBulkLocations(bulkHangoutIds, bulkLocation);
          onMessage(`Updated location on ${bulkHangoutIds.length} hangout(s).`);
        }}>Apply Location</Button>
      </Card>

      <Card className="!p-4 space-y-3">
        <h3 className="font-medium" style={{ color: 'var(--text-heading)' }}>Empty Friends</h3>
        {preview.emptyFriends.length === 0 ? (
          <p className="text-sm opacity-70">No empty friend profiles found.</p>
        ) : (
          <>
            <p className="text-sm opacity-70">{preview.emptyFriends.length} friend(s) with no tags, notes, or activity metadata.</p>
            <Button size="sm" variant="danger" onClick={() => setConfirmDeleteFriends(preview.emptyFriends.map((e) => e.friend.id))}>
              Delete Empty Friends
            </Button>
          </>
        )}
        <Button size="sm" variant="secondary" onClick={() => {
          runCleanupNormalizeNames();
          onMessage('Normalized friend names (trimmed whitespace).');
        }}>Normalize Imported Names</Button>
      </Card>

      <ConfirmModal open={confirmMerge} onClose={() => setConfirmMerge(false)} onConfirm={() => {
        runCleanupMergeFriends(primaryId, duplicateIdsToMerge);
        onMessage(`Merged ${duplicateIdsToMerge.length} duplicate friend(s).`);
        setMergeGroup('');
      }} title="Merge Friends" message={`Merge ${duplicateIdsToMerge.length} duplicate(s) into the primary friend? This cannot be undone except via backup restore.`} />

      <ConfirmModal open={!!confirmDeleteFriends?.length} onClose={() => setConfirmDeleteFriends(null)} onConfirm={() => {
        if (confirmDeleteFriends) {
          runCleanupDeleteFriends(confirmDeleteFriends);
          onMessage(`Deleted ${confirmDeleteFriends.length} empty friend(s).`);
        }
      }} title="Delete Empty Friends" message={`Delete ${confirmDeleteFriends?.length ?? 0} empty friend profile(s)?`} />

      <ConfirmModal open={!!confirmDeleteHangouts?.length} onClose={() => setConfirmDeleteHangouts(null)} onConfirm={() => {
        if (confirmDeleteHangouts) {
          runCleanupDeleteHangouts(confirmDeleteHangouts);
          onMessage(`Deleted ${confirmDeleteHangouts.length} duplicate hangout(s).`);
        }
      }} title="Delete Duplicate Hangouts" message={`Delete ${confirmDeleteHangouts?.length ?? 0} duplicate hangout(s)?`} />
    </div>
  );
}
