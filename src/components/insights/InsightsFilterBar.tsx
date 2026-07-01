import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Select } from '../ui/FormFields';
import { Badge } from '../ui/Misc';
import {
  filterHangoutsByInsights,
  getInsightsFilterChips,
  hasActiveInsightsFilters,
  type InsightsFilters,
} from '../../lib/insights-filters';
import { optionSelectOptions } from '../../lib/social-options';
import { getActiveTypeOptions } from '../../lib/hangout-categories';
import { LocationAutocomplete } from '../social/LocationAutocomplete';

interface InsightsFilterBarProps {
  filters: InsightsFilters;
  setFilter: <K extends keyof InsightsFilters>(key: K, value: InsightsFilters[K]) => void;
  clearFilters: () => void;
  removeChip: (key: keyof InsightsFilters) => void;
  showTimelineKinds?: boolean;
}

export function InsightsFilterBar({
  filters,
  setFilter,
  clearFilters,
  removeChip,
  showTimelineKinds = false,
}: InsightsFilterBarProps) {
  const { data } = useApp();

  const catalog = data.hangoutTypesByCategory ?? {};
  const settingsCategories = data.hangoutCategories ?? [];

  const hangoutTypeOptions = useMemo(
    () => getActiveTypeOptions(catalog, settingsCategories, filters.hangoutCategory),
    [catalog, settingsCategories, filters.hangoutCategory]
  );

  const segmentTypeOptions = useMemo(
    () => getActiveTypeOptions(catalog, settingsCategories),
    [catalog, settingsCategories]
  );

  const chips = getInsightsFilterChips(filters, data.friends);

  return (
    <div className="space-y-3 text-left">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select
          label="Friend"
          value={filters.friendId}
          onChange={(e) => setFilter('friendId', e.target.value)}
          options={[{ value: '', label: 'All friends' }, ...data.friends.map((f) => ({ value: f.id, label: f.name }))]}
        />
        <Select
          label="Friend tag"
          value={filters.friendTag}
          onChange={(e) => setFilter('friendTag', e.target.value)}
          options={[{ value: '', label: 'All tags' }, ...optionSelectOptions(data.friendTags)]}
        />
        <Select
          label="Friend group"
          value={filters.friendGroup}
          onChange={(e) => setFilter('friendGroup', e.target.value)}
          options={[{ value: '', label: 'All groups' }, ...optionSelectOptions(data.friendGroups)]}
        />
        <Select
          label="Relationship status"
          value={filters.relationshipStatus}
          onChange={(e) => setFilter('relationshipStatus', e.target.value)}
          options={[{ value: '', label: 'All statuses' }, ...optionSelectOptions(data.relationshipStatuses)]}
        />
        <Select
          label="Hangout category"
          value={filters.hangoutCategory}
          onChange={(e) => setFilter('hangoutCategory', e.target.value)}
          options={[{ value: '', label: 'All categories' }, ...optionSelectOptions(data.hangoutCategories)]}
        />
        <Select
          label="Hangout type"
          value={filters.hangoutType}
          onChange={(e) => setFilter('hangoutType', e.target.value)}
          options={[
            { value: '', label: 'All types' },
            ...optionSelectOptions(hangoutTypeOptions),
          ]}
        />
        <Select
          label="Segment type"
          value={filters.segmentType}
          onChange={(e) => setFilter('segmentType', e.target.value)}
          options={[
            { value: '', label: 'All segment types' },
            ...optionSelectOptions(segmentTypeOptions),
          ]}
        />
        <LocationAutocomplete
          label="Location"
          value={filters.location}
          onChange={(location) => setFilter('location', location)}
          filterMode
          showFavorites={false}
        />
        <Select
          label="People in hangout"
          value={filters.peopleCount}
          onChange={(e) => setFilter('peopleCount', e.target.value)}
          options={[
            { value: '', label: 'Any size' },
            { value: '1', label: 'Solo (1)' },
            { value: '2', label: '2 people' },
            { value: '3+', label: '3+ people' },
          ]}
        />
      </div>

      {showTimelineKinds && (
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={filters.showSleep} onChange={(e) => setFilter('showSleep', e.target.checked)} className="rounded" />
            Sleep
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={filters.showNaps} onChange={(e) => setFilter('showNaps', e.target.checked)} className="rounded" />
            Naps
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={filters.showHangouts} onChange={(e) => setFilter('showHangouts', e.target.checked)} className="rounded" />
            Hangouts
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={filters.showSegments} onChange={(e) => setFilter('showSegments', e.target.checked)} className="rounded" />
            Segments
          </label>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeChip(chip.key)}
              className="inline-flex items-center gap-1"
            >
              <Badge color="#6366f1">{chip.label} ×</Badge>
            </button>
          ))}
          {hasActiveInsightsFilters(filters) && (
            <Button size="sm" variant="ghost" type="button" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function useFilteredAppData(
  data: ReturnType<typeof useApp>['data'],
  filters: InsightsFilters,
  rangeStart?: Date,
  rangeEnd?: Date
) {
  return useMemo(() => {
    const hangouts = filterHangoutsByInsights(data.hangouts, filters, data.friends, rangeStart, rangeEnd);
    let sleepEntries = data.sleepEntries;
    let napEntries = data.napEntries;
    if (rangeStart && rangeEnd) {
      sleepEntries = sleepEntries.filter((s) => {
        const t = new Date(s.wakeUp);
        return t >= rangeStart && t <= rangeEnd;
      });
      napEntries = napEntries.filter((n) => {
        const t = new Date(n.napEnd);
        return t >= rangeStart && t <= rangeEnd;
      });
    }
    return { ...data, hangouts, sleepEntries, napEntries };
  }, [data, filters, rangeStart, rangeEnd]);
}
