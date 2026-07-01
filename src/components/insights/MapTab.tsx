import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { formatDuration } from '../../lib/dates';
import {
  friendNamesAtLocation,
  formatLocationDate,
  getLocationHistory,
  type LocationSummary,
} from '../../lib/location-history';
import { filterHangoutsByInsights } from '../../lib/insights-filters';
import { useInsightsFilters } from '../../hooks/useInsightsFilters';
import { useStatsDateRange, statsRangeArgs } from '../../hooks/useStatsDateRange';
import { StatsDateRangeFilter } from './StatsDateRangeFilter';
import { InsightsFilterBar } from './InsightsFilterBar';
import { HangoutFormModal } from '../social/HangoutFormModal';

export function MapTab() {
  const { data } = useApp();
  const { filters, setFilter, clearFilters, removeChip } = useInsightsFilters();
  const { range, resolved, setPreset, setCustomDates, clearFilter } = useStatsDateRange();
  const { start, end } = statsRangeArgs(resolved);
  const [selected, setSelected] = useState<LocationSummary | null>(null);
  const [editHangoutId, setEditHangoutId] = useState<string | null>(null);

  const hangouts = useMemo(
    () => filterHangoutsByInsights(data.hangouts, filters, data.friends, start, end),
    [data.hangouts, data.friends, filters, start, end]
  );

  const locations = useMemo(() => getLocationHistory(hangouts), [hangouts]);

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
        />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2 text-left" style={{ color: 'var(--text-heading)' }}>
          Location Map
        </h2>
        <p className="text-sm opacity-70 mb-4 text-left">
          Placeholder map view — hangout locations grouped below. Select a location to see visit history.
        </p>
        <div
          className="rounded-lg border min-h-[180px] flex items-center justify-center mb-4 opacity-80"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div className="text-center p-6">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="text-sm opacity-70">{locations.length} saved location{locations.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        {locations.length === 0 ? (
          <p className="text-sm opacity-70 text-left">No locations logged yet. Add locations when logging hangouts.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {locations.map((loc) => (
              <button
                key={loc.location}
                type="button"
                onClick={() => setSelected(loc)}
                className={`text-left p-3 rounded-lg border transition-colors ${selected?.location === loc.location ? 'ring-2 ring-primary' : ''}`}
                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
              >
                <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>📍 {loc.location}</p>
                <p className="text-xs opacity-70 mt-1">
                  {loc.visitCount} visit{loc.visitCount === 1 ? '' : 's'} · {loc.totalHours.toFixed(1)}h
                </p>
                <p className="text-xs opacity-60 mt-1 truncate">
                  {friendNamesAtLocation(loc.friendIds, data.friends)}
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <Card>
          <h3 className="font-semibold mb-3 text-left" style={{ color: 'var(--text-heading)' }}>
            {selected.location}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
            <div><span className="opacity-60 block">Visits</span><span className="font-medium">{selected.visitCount}</span></div>
            <div><span className="opacity-60 block">Total Hours</span><span className="font-medium">{selected.totalHours.toFixed(1)}h</span></div>
            <div><span className="opacity-60 block">Most Common Type</span><span className="font-medium">{selected.mostCommonType ?? '—'}</span></div>
            <div><span className="opacity-60 block">Friends Seen</span><span className="font-medium">{friendNamesAtLocation(selected.friendIds, data.friends) || '—'}</span></div>
            <div><span className="opacity-60 block">First Visit</span><span className="font-medium">{formatLocationDate(selected.firstVisit)}</span></div>
            <div><span className="opacity-60 block">Last Visit</span><span className="font-medium">{formatLocationDate(selected.lastVisit)}</span></div>
          </div>
          <h4 className="text-sm font-medium mb-2 opacity-80">Recent hangouts</h4>
          <ul className="space-y-2">
            {selected.recentVisits.map((v) => (
              <li key={`${v.hangoutId}-${v.segmentId ?? 'main'}`}>
                <button
                  type="button"
                  onClick={() => setEditHangoutId(v.hangoutId)}
                  className="w-full text-left p-2 rounded border text-sm hover:opacity-90"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {formatLocationDate(v.startTime)} · {v.type} · {formatDuration(v.durationMinutes)}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold mb-3 text-left" style={{ color: 'var(--text-heading)' }}>Location History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="opacity-60 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Visits</th>
                <th className="py-2 pr-4">Hours</th>
                <th className="py-2 pr-4">Friends</th>
                <th className="py-2 pr-4">Top Type</th>
                <th className="py-2">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.location} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 pr-4 font-medium">{loc.location}</td>
                  <td className="py-2 pr-4">{loc.visitCount}</td>
                  <td className="py-2 pr-4">{loc.totalHours.toFixed(1)}h</td>
                  <td className="py-2 pr-4 max-w-[160px] truncate">{friendNamesAtLocation(loc.friendIds, data.friends)}</td>
                  <td className="py-2 pr-4">{loc.mostCommonType ?? '—'}</td>
                  <td className="py-2">{formatLocationDate(loc.lastVisit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <HangoutFormModal hangoutId={editHangoutId} open={!!editHangoutId} onClose={() => setEditHangoutId(null)} />
    </div>
  );
}
