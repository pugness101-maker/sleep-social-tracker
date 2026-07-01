import { useState, type ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormFields';
import { FriendPicker } from './FriendPicker';
import { HangoutCategoryTypeSelect } from './HangoutCategoryTypeSelect';
import { LocationAutocomplete } from './LocationAutocomplete';
import { DEFAULT_HANGOUT_OCCASION } from '../../types';
import type { HangoutBulkEditPatch } from '../../lib/hangout-bulk';

interface HangoutBulkEditModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (patch: HangoutBulkEditPatch) => void;
  hangoutOccasions: string[];
  selectedCount: number;
}

export function HangoutBulkEditModal({
  open,
  onClose,
  onApply,
  hangoutOccasions,
  selectedCount,
}: HangoutBulkEditModalProps) {
  const [changeOccasion, setChangeOccasion] = useState(false);
  const [occasion, setOccasion] = useState(DEFAULT_HANGOUT_OCCASION);

  const [changeCategoryType, setChangeCategoryType] = useState(false);
  const [category, setCategory] = useState('Social');
  const [type, setType] = useState('Chill');

  const [changeLocation, setChangeLocation] = useState(false);
  const [locationMode, setLocationMode] = useState<'replace' | 'clear'>('replace');
  const [location, setLocation] = useState('');

  const [changeNotes, setChangeNotes] = useState(false);
  const [notesMode, setNotesMode] = useState<'append' | 'replace' | 'clear'>('append');
  const [notes, setNotes] = useState('');

  const [changeTime, setChangeTime] = useState(false);
  const [timeMode, setTimeMode] = useState<'shift' | 'set_start' | 'set_end'>('shift');
  const [shiftMinutes, setShiftMinutes] = useState('30');
  const [setStartTime, setSetStartTime] = useState('');
  const [setEndTime, setSetEndTime] = useState('');

  const [changeFriends, setChangeFriends] = useState(false);
  const [friendsMode, setFriendsMode] = useState<'replace' | 'add_remove'>('add_remove');
  const [replaceFriends, setReplaceFriends] = useState<string[]>([]);
  const [addFriends, setAddFriends] = useState<string[]>([]);
  const [removeFriends, setRemoveFriends] = useState<string[]>([]);

  const [changeArchive, setChangeArchive] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<'archive' | 'restore'>('archive');

  const resetForm = () => {
    setChangeOccasion(false);
    setChangeCategoryType(false);
    setChangeLocation(false);
    setChangeNotes(false);
    setChangeTime(false);
    setChangeFriends(false);
    setChangeArchive(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleApply = () => {
    const patch: HangoutBulkEditPatch = {};

    if (changeOccasion) patch.occasion = occasion;
    if (changeCategoryType) {
      patch.category = category;
      patch.type = type;
    }
    if (changeLocation) {
      patch.location =
        locationMode === 'clear' ? { mode: 'clear' } : { mode: 'replace', value: location };
    }
    if (changeNotes) {
      patch.notes =
        notesMode === 'clear'
          ? { mode: 'clear' }
          : { mode: notesMode, value: notes };
    }
    if (changeTime) {
      if (timeMode === 'shift') {
        const mins = Number.parseInt(shiftMinutes, 10);
        if (!Number.isNaN(mins) && mins !== 0) patch.timeShiftMinutes = mins;
      } else if (timeMode === 'set_start' && setStartTime) {
        patch.setStartTime = setStartTime;
      } else if (timeMode === 'set_end' && setEndTime) {
        patch.setEndTime = setEndTime;
      }
    }
    if (changeFriends) {
      if (friendsMode === 'replace') {
        patch.friends = { mode: 'replace', replace: replaceFriends };
      } else {
        patch.friends = { mode: 'add_remove', add: addFriends, remove: removeFriends };
      }
    }
    if (changeArchive) patch.isArchived = archiveStatus === 'archive';

    if (Object.keys(patch).length === 0) return;
    onApply(patch);
    resetForm();
    onClose();
  };

  const hasChanges =
    changeOccasion ||
    changeCategoryType ||
    changeLocation ||
    changeNotes ||
    changeTime ||
    changeFriends ||
    changeArchive;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Bulk Edit — ${selectedCount} hangout${selectedCount === 1 ? '' : 's'}`}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasChanges}>
            Apply Changes
          </Button>
        </>
      }
    >
      <p className="text-sm opacity-70 mb-4 text-left">
        Check only the fields you want to change. Unchecked fields are left unchanged. Activity
        segments are not modified.
      </p>

      <div className="space-y-5 text-left">
        <FieldToggle
          checked={changeOccasion}
          onChange={setChangeOccasion}
          label="Occasion"
        >
          <Select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            options={hangoutOccasions.map((o) => ({ value: o, label: o }))}
          />
        </FieldToggle>

        <FieldToggle
          checked={changeCategoryType}
          onChange={setChangeCategoryType}
          label="Category & Type"
        >
          <HangoutCategoryTypeSelect
            category={category}
            type={type}
            onMainFieldsChange={(c, t) => {
              setCategory(c);
              setType(t);
            }}
          />
        </FieldToggle>

        <FieldToggle checked={changeLocation} onChange={setChangeLocation} label="Location">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={locationMode === 'replace'}
                onChange={() => setLocationMode('replace')}
              />
              Replace location
            </label>
            {locationMode === 'replace' && (
              <LocationAutocomplete value={location} onChange={setLocation} placeholder="New location…" />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={locationMode === 'clear'}
                onChange={() => setLocationMode('clear')}
              />
              Clear location
            </label>
          </div>
        </FieldToggle>

        <FieldToggle checked={changeNotes} onChange={setChangeNotes} label="Notes">
          <div className="space-y-2">
            <Select
              value={notesMode}
              onChange={(e) => setNotesMode(e.target.value as 'append' | 'replace' | 'clear')}
              options={[
                { value: 'append', label: 'Append text' },
                { value: 'replace', label: 'Replace text' },
                { value: 'clear', label: 'Clear notes' },
              ]}
            />
            {notesMode !== 'clear' && (
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            )}
          </div>
        </FieldToggle>

        <FieldToggle checked={changeTime} onChange={setChangeTime} label="Start / End Time">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={timeMode === 'shift'}
                onChange={() => setTimeMode('shift')}
              />
              Shift start &amp; end (keeps duration)
            </label>
            {timeMode === 'shift' && (
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="number"
                  value={shiftMinutes}
                  onChange={(e) => setShiftMinutes(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm opacity-70">minutes (e.g. 30, -15, 1440 for +1 day)</span>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={timeMode === 'set_start'}
                onChange={() => setTimeMode('set_start')}
              />
              Set exact start
            </label>
            {timeMode === 'set_start' && (
              <Input type="datetime-local" value={setStartTime} onChange={(e) => setSetStartTime(e.target.value)} />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={timeMode === 'set_end'}
                onChange={() => setTimeMode('set_end')}
              />
              Set exact end
            </label>
            {timeMode === 'set_end' && (
              <Input type="datetime-local" value={setEndTime} onChange={(e) => setSetEndTime(e.target.value)} />
            )}
          </div>
        </FieldToggle>

        <FieldToggle checked={changeFriends} onChange={setChangeFriends} label="Friends">
          <div className="space-y-3">
            <Select
              value={friendsMode}
              onChange={(e) => setFriendsMode(e.target.value as 'replace' | 'add_remove')}
              options={[
                { value: 'add_remove', label: 'Add / Remove friends' },
                { value: 'replace', label: 'Replace friends' },
              ]}
            />
            {friendsMode === 'replace' ? (
              <FriendPicker selected={replaceFriends} onChange={setReplaceFriends} />
            ) : (
              <>
                <FriendPicker label="Add friends" selected={addFriends} onChange={setAddFriends} />
                <FriendPicker label="Remove friends" selected={removeFriends} onChange={setRemoveFriends} />
              </>
            )}
          </div>
        </FieldToggle>

        <FieldToggle checked={changeArchive} onChange={setChangeArchive} label="Archive Status">
          <Select
            value={archiveStatus}
            onChange={(e) => setArchiveStatus(e.target.value as 'archive' | 'restore')}
            options={[
              { value: 'archive', label: 'Archive selected hangouts' },
              { value: 'restore', label: 'Restore from archive' },
            ]}
          />
        </FieldToggle>
      </div>
    </Modal>
  );
}

function FieldToggle({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
      <label className="flex items-center gap-2 font-medium text-sm cursor-pointer mb-2">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {checked && <div className="mt-2 pl-6">{children}</div>}
    </div>
  );
}
