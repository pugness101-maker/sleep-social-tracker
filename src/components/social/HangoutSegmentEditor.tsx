import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormFields';
import { calcDurationMinutes, formatDuration } from '../../lib/dates';
import {
  createHangoutSegment,
  getSegmentDurationMinutes,
  newSegmentDefaults,
} from '../../lib/hangout-segments';
import { hangoutTypeSelectOptions } from '../../lib/social-options';
import type { HangoutSegment } from '../../types';

interface HangoutSegmentEditorProps {
  segments: HangoutSegment[];
  hangoutTypes: string[];
  hangoutStart: string;
  hangoutEnd: string;
  defaultType: string;
  onChange: (segments: HangoutSegment[]) => void;
}

export function HangoutSegmentEditor({
  segments,
  hangoutTypes,
  hangoutStart,
  hangoutEnd,
  defaultType,
  onChange,
}: HangoutSegmentEditorProps) {
  const addSegment = () => {
    const defaults = newSegmentDefaults(hangoutStart, hangoutEnd, defaultType, segments);
    onChange([
      ...segments,
      createHangoutSegment(defaults.type, defaults.startTime, defaults.endTime),
    ]);
  };

  const updateSegment = (id: string, patch: Partial<HangoutSegment>) => {
    onChange(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSegment = (id: string) => {
    onChange(segments.filter((s) => s.id !== id));
  };

  const totalSegmentMinutes = segments.reduce((sum, s) => sum + getSegmentDurationMinutes(s), 0);
  const hangoutMinutes =
    hangoutStart && hangoutEnd ? calcDurationMinutes(hangoutStart, hangoutEnd) : 0;

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
            Activity Segments
          </p>
          <p className="text-xs opacity-60 mt-0.5">
            Optional breakdown by activity type. Statistics use segments when present.
          </p>
        </div>
        <Button size="sm" variant="secondary" type="button" onClick={addSegment}>
          Add Segment
        </Button>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm opacity-70 py-2">No segments — the main hangout type is used for statistics.</p>
      ) : (
        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className="rounded-lg p-3 space-y-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium opacity-70">Segment {index + 1}</span>
                <Button size="sm" variant="ghost" type="button" onClick={() => removeSegment(segment.id)}>
                  Delete
                </Button>
              </div>
              <Select
                label="Type"
                value={segment.type}
                onChange={(e) => updateSegment(segment.id, { type: e.target.value })}
                options={hangoutTypeSelectOptions(hangoutTypes, segment.type)}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Start"
                  type="datetime-local"
                  value={segment.startTime}
                  onChange={(e) => updateSegment(segment.id, { startTime: e.target.value })}
                />
                <Input
                  label="End"
                  type="datetime-local"
                  value={segment.endTime}
                  onChange={(e) => updateSegment(segment.id, { endTime: e.target.value })}
                />
              </div>
              {segment.startTime && segment.endTime && (
                <p className="text-xs opacity-70">
                  Duration: {formatDuration(getSegmentDurationMinutes(segment))}
                </p>
              )}
              <Input
                label="Location (optional)"
                value={segment.location}
                onChange={(e) => updateSegment(segment.id, { location: e.target.value })}
              />
              <Textarea
                label="Notes (optional)"
                value={segment.notes}
                onChange={(e) => updateSegment(segment.id, { notes: e.target.value })}
              />
            </div>
          ))}
          {hangoutMinutes > 0 && (
            <p className="text-xs opacity-60">
              Segments total: {formatDuration(totalSegmentMinutes)}
              {totalSegmentMinutes !== hangoutMinutes && (
                <span> · Hangout duration: {formatDuration(hangoutMinutes)}</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
