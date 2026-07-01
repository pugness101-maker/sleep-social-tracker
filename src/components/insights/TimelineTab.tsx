import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { formatDateTime, formatDuration } from '../../lib/dates';
import { buildUniversalTimeline, groupTimelineByDate } from '../../lib/universal-timeline';
import { useInsightsFilters } from '../../hooks/useInsightsFilters';
import { useStatsDateRange, statsRangeArgs } from '../../hooks/useStatsDateRange';
import { StatsDateRangeFilter } from './StatsDateRangeFilter';
import { InsightsFilterBar } from './InsightsFilterBar';
import { HangoutFormModal } from '../social/HangoutFormModal';

export function TimelineTab() {
  const { data } = useApp();
  const navigate = useNavigate();
  const { filters, setFilter, clearFilters, removeChip } = useInsightsFilters();
  const { range, resolved, setPreset, setCustomDates, clearFilter } = useStatsDateRange();
  const { start, end } = statsRangeArgs(resolved);
  const [editHangoutId, setEditHangoutId] = useState<string | null>(null);

  const items = useMemo(
    () => buildUniversalTimeline(data, filters, start, end, 300),
    [data, filters, start, end]
  );
  const groups = useMemo(() => groupTimelineByDate(items), [items]);

  const handleClick = (item: ReturnType<typeof buildUniversalTimeline>[number]) => {
    if (item.kind === 'hangout' || item.kind === 'segment') {
      setEditHangoutId(item.hangoutId ?? null);
    } else {
      navigate('/sleep');
    }
  };

  const icon = (kind: string) => {
    if (kind === 'sleep') return '😴';
    if (kind === 'nap') return '💤';
    if (kind === 'segment') return '🎯';
    return '👥';
  };

  return (
    <div className="space-y-6">
      <StatsDateRangeFilter
        range={range}
        label={resolved.label}
        onPreset={setPreset}
        onCustomDates={setCustomDates}
        onClear={clearFilter}
      />
      <Card>
        <InsightsFilterBar
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          removeChip={removeChip}
          showTimelineKinds
        />
      </Card>

      {groups.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No activity matches your filters.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              <h3 className="text-sm font-semibold mb-3 text-left sticky top-0 py-2" style={{ color: 'var(--text-heading)', background: 'var(--page-bg, var(--bg))' }}>
                {group.label}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(item)}
                      className="w-full text-left p-3 rounded-lg border transition-colors hover:opacity-90"
                      style={{ borderColor: 'var(--border)', background: 'var(--card-bg, var(--bg))' }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">{icon(item.kind)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{item.title}</p>
                          <p className="text-xs opacity-70 mt-0.5">{item.detail}</p>
                          {item.location && <p className="text-xs opacity-60 mt-0.5">📍 {item.location}</p>}
                        </div>
                        <div className="text-right shrink-0 text-xs opacity-60">
                          <p>{formatDateTime(item.timestamp)}</p>
                          {item.durationMinutes > 0 && <p>{formatDuration(item.durationMinutes)}</p>}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <HangoutFormModal
        hangoutId={editHangoutId}
        open={!!editHangoutId}
        onClose={() => setEditHangoutId(null)}
      />
    </div>
  );
}
