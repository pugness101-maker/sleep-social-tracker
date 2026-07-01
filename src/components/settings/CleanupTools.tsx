import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/FormFields';
import { ConfirmModal, Modal } from '../ui/Modal';
import { HangoutCategoryTypeSelect } from '../social/HangoutCategoryTypeSelect';
import { LocationAutocomplete } from '../social/LocationAutocomplete';
import { SettingsAccordionSection } from './SettingsAccordionSection';
import { useSettingsAccordionContext } from './SettingsAccordionContext';

interface CleanupToolsProps {
  onMessage: (msg: string, isError?: boolean) => void;
  onResetData: () => void;
}

export function CleanupTools({ onMessage, onResetData }: CleanupToolsProps) {
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

  const { isNestedOpen, toggleNested } = useSettingsAccordionContext();
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
  const [confirmReset, setConfirmReset] = useState(false);

  const selectedMergeGroup = preview.duplicateFriends.find((g) => g.normalizedName === mergeGroup);
  const duplicateIdsToMerge = selectedMergeGroup
    ? selectedMergeGroup.friends.filter((f) => f.id !== primaryId).map((f) => f.id)
    : [];

  return (
    <div className="space-y-2 text-left">
      <p className="text-sm opacity-70 px-1 pb-1">
        All cleanup actions create an automatic backup first. Use Undo Last Cleanup in Backup & Restore if needed.
      </p>

      <SettingsAccordionSection
        nested
        title="Cleanup Summary"
        summary={`${data.friends.length} friends, ${data.hangouts.length} hangouts, ${data.ideas.length} ideas`}
        open={isNestedOpen('data_management', 'cleanup_summary')}
        onToggle={() => toggleNested('data_management', 'cleanup_summary')}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <p>Sleep entries: <strong>{data.sleepEntries.length}</strong></p>
          <p>Nap entries: <strong>{data.napEntries.length}</strong></p>
          <p>Friends: <strong>{data.friends.length}</strong></p>
          <p>Hangouts: <strong>{data.hangouts.length}</strong></p>
          <p>Ideas: <strong>{data.ideas.length}</strong></p>
          <p>Duplicate friend groups: <strong>{preview.duplicateFriends.length}</strong></p>
          <p>Duplicate hangout groups: <strong>{preview.duplicateHangouts.length}</strong></p>
          <p>Empty friends: <strong>{preview.emptyFriends.length}</strong></p>
        </div>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        nested
        title="Merge Duplicate Friends"
        summary={
          preview.duplicateFriends.length === 0
            ? 'No duplicate names found'
            : `${preview.duplicateFriends.length} duplicate group(s) to review`
        }
        open={isNestedOpen('data_management', 'merge_duplicate_friends')}
        onToggle={() => toggleNested('data_management', 'merge_duplicate_friends')}
      >
        {preview.duplicateFriends.length === 0 ? (
          <p className="text-sm opacity-70">No duplicate friend names found.</p>
        ) : (
          <div className="space-y-3">
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
                <label className="text-sm block">Primary friend</label>
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
          </div>
        )}
      </SettingsAccordionSection>

      <SettingsAccordionSection
        nested
        title="Rename Friend"
        summary="Update a friend's name everywhere"
        open={isNestedOpen('data_management', 'rename_friend')}
        onToggle={() => toggleNested('data_management', 'rename_friend')}
      >
        <div className="space-y-3">
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
        </div>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        nested
        title="Duplicate Hangouts"
        summary={
          preview.duplicateHangouts.length === 0
            ? 'No duplicate hangouts detected'
            : `${preview.duplicateHangouts.length} duplicate group(s) found`
        }
        open={isNestedOpen('data_management', 'duplicate_hangouts')}
        onToggle={() => toggleNested('data_management', 'duplicate_hangouts')}
      >
        {preview.duplicateHangouts.length === 0 ? (
          <p className="text-sm opacity-70">No duplicate hangouts detected.</p>
        ) : (
          <div className="space-y-3">
            {preview.duplicateHangouts.map((group) => (
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
            ))}
          </div>
        )}
      </SettingsAccordionSection>

      <SettingsAccordionSection
        nested
        title="Bulk Edit Hangouts"
        summary="Apply category, type, or location to multiple hangouts"
        open={isNestedOpen('data_management', 'bulk_edit_hangouts')}
        onToggle={() => toggleNested('data_management', 'bulk_edit_hangouts')}
      >
        <div className="space-y-3">
          <label className="text-sm block">Select hangouts (hold Ctrl/Cmd for multiple)</label>
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
        </div>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        nested
        title="Empty Friends"
        summary={
          preview.emptyFriends.length === 0
            ? 'No empty profiles found'
            : `${preview.emptyFriends.length} empty profile(s) to review`
        }
        open={isNestedOpen('data_management', 'empty_friends')}
        onToggle={() => toggleNested('data_management', 'empty_friends')}
      >
        {preview.emptyFriends.length === 0 ? (
          <p className="text-sm opacity-70">No empty friend profiles found.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm opacity-70">{preview.emptyFriends.length} friend(s) with no tags, notes, or activity metadata.</p>
            <Button size="sm" variant="danger" onClick={() => setConfirmDeleteFriends(preview.emptyFriends.map((e) => e.friend.id))}>
              Delete Empty Friends
            </Button>
          </div>
        )}
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => {
          runCleanupNormalizeNames();
          onMessage('Normalized friend names (trimmed whitespace).');
        }}>Normalize Imported Names</Button>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        nested
        title="Clear All Data"
        summary="Permanently delete all local data"
        open={isNestedOpen('data_management', 'clear_all_data')}
        onToggle={() => toggleNested('data_management', 'clear_all_data')}
      >
        <p className="text-sm opacity-70 mb-4">All data is stored locally in your browser. Clearing data cannot be undone.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>Clear All Data</Button>
      </SettingsAccordionSection>

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

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Clear All Data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => {
              onResetData();
              setConfirmReset(false);
              onMessage('All data cleared.');
            }}>
              Clear Everything
            </Button>
          </>
        }
      >
        <p>This will permanently delete all sleep, nap, friend, hangout, and idea data.</p>
      </Modal>
    </div>
  );
}
