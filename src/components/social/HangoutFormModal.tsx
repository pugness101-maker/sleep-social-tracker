import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/FormFields';
import { LocationAutocomplete } from './LocationAutocomplete';
import { HangoutCategoryTypeSelect } from './HangoutCategoryTypeSelect';
import { hangoutMainFieldsForForm } from '../../lib/hangout-categories';
import { calcDurationMinutes, formatDuration } from '../../lib/dates';
import { HangoutSegmentEditor } from './HangoutSegmentEditor';
import { FriendPicker } from './FriendPicker';
import type { HangoutSegment } from '../../types';

interface HangoutFormModalProps {
  hangoutId: string | null;
  open: boolean;
  onClose: () => void;
}

export function HangoutFormModal({ hangoutId, open, onClose }: HangoutFormModalProps) {
  const { data, updateHangout } = useApp();
  const hangout = hangoutId ? data.hangouts.find((h) => h.id === hangoutId) : null;
  const catalog = data.hangoutTypesByCategory ?? {};
  const settingsCategories = data.hangoutCategories ?? [];

  const [form, setForm] = useState({
    friendIds: [] as string[],
    startTime: '',
    endTime: '',
    location: '',
    category: '',
    type: '',
    notes: '',
    segments: [] as HangoutSegment[],
  });

  useEffect(() => {
    if (!hangout) return;
    const main = hangoutMainFieldsForForm(hangout, catalog, settingsCategories);
    setForm({
      friendIds: hangout.friendIds,
      startTime: hangout.startTime,
      endTime: hangout.endTime,
      location: hangout.location,
      category: main.category,
      type: main.type,
      notes: hangout.notes,
      segments: hangout.segments ?? [],
    });
  }, [hangout, catalog, settingsCategories]);

  const handleSave = () => {
    if (!hangoutId) return;
    updateHangout(hangoutId, form);
    onClose();
  };

  if (!hangout) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Hangout"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div className="space-y-4 text-left">
        <FriendPicker
          selected={form.friendIds}
          onChange={(friendIds) => setForm((prev) => ({ ...prev, friendIds }))}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Start Time" type="datetime-local" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} />
          <Input label="End Time" type="datetime-local" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} />
        </div>
        {form.startTime && form.endTime && (
          <p className="text-sm opacity-70">Duration: {formatDuration(calcDurationMinutes(form.startTime, form.endTime))}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <HangoutCategoryTypeSelect
            category={form.category}
            type={form.type}
            onMainFieldsChange={(category, type) => setForm((prev) => ({ ...prev, category, type }))}
          />
          <LocationAutocomplete
            label="Location"
            value={form.location}
            onChange={(location) => setForm((prev) => ({ ...prev, location }))}
            placeholder="Search locations…"
          />
        </div>
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
        <HangoutSegmentEditor
          segments={form.segments}
          hangoutFriendIds={form.friendIds}
          hangoutCategory={form.category}
          friends={data.friends}
          hangoutStart={form.startTime}
          hangoutEnd={form.endTime}
          onChange={(segments) => setForm((prev) => ({ ...prev, segments }))}
          onHangoutFriendsChange={(friendIds) => setForm((prev) => ({ ...prev, friendIds }))}
        />
      </div>
    </Modal>
  );
}
