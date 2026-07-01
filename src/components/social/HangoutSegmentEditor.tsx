import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormFields';
import { calcDurationMinutes, formatDuration } from '../../lib/dates';
import {
  createHangoutSegment,
  formatDurationInput,
  getSegmentEffectiveDurationMinutes,
  newSegmentDefaults,
  parseDurationInput,
  segmentHasSpecificTime,
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

function SegmentDurationInput({
  segment,
  onChange,
}: {
  segment: HangoutSegment;
  onChange: (minutes: number | null) => void;
}) {
  const [text, setText] = useState(formatDurationInput(segment.durationMinutes));

  useEffect(() => {
    setText(formatDurationInput(segment.durationMinutes));
  }, [segment.id, segment.durationMinutes]);

  const commit = (value: string) => {
    const parsed = parseDurationInput(value);
    onChange(parsed);
    setText(parsed != null ? formatDurationInput(parsed) : value.trim());
  };

  return (
    <Input
      label="Duration (optional)"
      placeholder="e.g. 1h, 45m, 1h 30m"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => commit(text)}
    />
  );
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
    onChange([...segments, createHangoutSegment(defaultType)]);
  };

  const updateSegment = (id: string, patch: Partial<HangoutSegment>) => {
    onChange(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSegment = (id: string) => {
    onChange(segments.filter((s) => s.id !== id));
  };

  const toggleSpecificTime = (segment: HangoutSegment, enabled: boolean) => {
    if (enabled) {
      const defaults = newSegmentDefaults(hangoutStart, hangoutEnd, segment.type, segments.filter((s) => s.id !== segment.id));
      updateSegment(segment.id, {
        startTime: defaults.startTime,
        endTime: defaults.endTime,
        durationMinutes: null,
      });
    } else {
      updateSegment(segment.id, { startTime: '', endTime: '' });
    }
  };

  const timedTotal = segments.reduce((sum, s) => sum + getSegmentEffectiveDurationMinutes(s), 0);

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
            Activity Segments
          </p>
          <p className="text-xs opacity-60 mt-0.5">
            Optional activity labels with optional time or duration. Segment times do not need to match hangout length.
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
          {segments.map((segment, index) => {
            const hasTime = segmentHasSpecificTime(segment);
            const effectiveDuration = getSegmentEffectiveDurationMinutes(segment);

            return (
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
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTime}
                    onChange={(e) => toggleSpecificTime(segment, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Add specific time</span>
                </label>
                {hasTime ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        label="Start"
                        type="datetime-local"
                        value={segment.startTime}
                        onChange={(e) =>
                          updateSegment(segment.id, {
                            startTime: e.target.value,
                            durationMinutes: null,
                          })
                        }
                      />
                      <Input
                        label="End"
                        type="datetime-local"
                        value={segment.endTime}
                        onChange={(e) =>
                          updateSegment(segment.id, {
                            endTime: e.target.value,
                            durationMinutes: null,
                          })
                        }
                      />
                    </div>
                    {segment.startTime && segment.endTime && (
                      <p className="text-xs opacity-70">
                        Duration: {formatDuration(calcDurationMinutes(segment.startTime, segment.endTime))}
                      </p>
                    )}
                  </>
                ) : (
                  <SegmentDurationInput
                    segment={segment}
                    onChange={(minutes) => updateSegment(segment.id, { durationMinutes: minutes })}
                  />
                )}
                {!hasTime && effectiveDuration === 0 && (
                  <p className="text-xs opacity-60">Label only — counted in activity stats, not activity time.</p>
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
            );
          })}
          {timedTotal > 0 && (
            <p className="text-xs opacity-60">
              Segment duration total: {formatDuration(timedTotal)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
