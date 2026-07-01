import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/FormFields';
import { calcDurationMinutes, formatDuration } from '../../lib/dates';
import { hangoutTypeSelectOptions } from '../../lib/social-options';
import { HangoutSegmentEditor } from './HangoutSegmentEditor';
import type { HangoutSegment } from '../../types';

interface HangoutFormModalProps {
  hangoutId: string | null;
  open: boolean;
  onClose: () => void;
}

export function HangoutFormModal({ hangoutId, open, onClose }: HangoutFormModalProps) {
  const { data, updateHangout } = useApp();
  const hangout = hangoutId ? data.hangouts.find((h) => h.id === hangoutId) : null;

  const [form, setForm] = useState({
    friendIds: [] as string[],
    startTime: '',
    endTime: '',
    location: '',
    type: '',
    notes: '',
    segments: [] as HangoutSegment[],
  });

  useEffect(() => {
    if (!hangout) return;
    setForm({
      friendIds: hangout.friendIds,
      startTime: hangout.startTime,
      endTime: hangout.endTime,
      location: hangout.location,
      type: hangout.type,
      notes: hangout.notes,
      segments: hangout.segments ?? [],
    });
  }, [hangout]);

  const toggleFriend = (id: string) => {
    setForm((prev) => ({
      ...prev,
      friendIds: prev.friendIds.includes(id)
        ? prev.friendIds.filter((fid) => fid !== id)
        : [...prev.friendIds, id],
    }));
  };

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
        <div>
          <span className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Friends</span>
          <div className="flex flex-wrap gap-2">
            {data.friends.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFriend(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${form.friendIds.includes(f.id) ? 'bg-primary text-white border-primary' : ''}`}
                style={!form.friendIds.includes(f.id) ? { borderColor: 'var(--border)' } : undefined}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Start Time" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <Input label="End Time" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </div>
        {form.startTime && form.endTime && (
          <p className="text-sm opacity-70">Duration: {formatDuration(calcDurationMinutes(form.startTime, form.endTime))}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={hangoutTypeSelectOptions(data.hangoutTypes, form.type)}
          />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <HangoutSegmentEditor
          segments={form.segments}
          hangoutFriendIds={form.friendIds}
          friends={data.friends}
          hangoutTypes={data.hangoutTypes}
          hangoutStart={form.startTime}
          hangoutEnd={form.endTime}
          defaultType={form.type}
          onChange={(segments) => setForm({ ...form, segments })}
          onHangoutFriendsChange={(friendIds) => setForm({ ...form, friendIds })}
        />
      </div>
    </Modal>
  );
}
