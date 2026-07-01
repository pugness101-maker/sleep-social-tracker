import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  defaultStatsDateRange,
  loadStatsDateRange,
  presetToStoredRange,
  resolveStatsDateRange,
  saveStatsDateRange,
  type StatsDatePreset,
  type StatsDateRange,
} from '../lib/stats-date-range';

export function useStatsDateRange() {
  const [range, setRangeState] = useState<StatsDateRange>(() => loadStatsDateRange());

  useEffect(() => {
    saveStatsDateRange(range);
  }, [range]);

  const resolved = useMemo(() => resolveStatsDateRange(range), [range]);

  const setPreset = useCallback((preset: StatsDatePreset) => {
    setRangeState(presetToStoredRange(preset));
  }, []);

  const setCustomDates = useCallback((startDate: string, endDate: string) => {
    setRangeState({ preset: 'custom', startDate, endDate });
  }, []);

  const clearFilter = useCallback(() => {
    setRangeState({ ...defaultStatsDateRange });
  }, []);

  return {
    range,
    resolved,
    setPreset,
    setCustomDates,
    clearFilter,
    setRange: setRangeState,
  };
}

export type StatsRangeBounds = { start?: Date; end?: Date };

export function statsRangeArgs(resolved: ReturnType<typeof resolveStatsDateRange>): StatsRangeBounds {
  if (!resolved.isFiltered || !resolved.start || !resolved.end) {
    return {};
  }
  return { start: resolved.start, end: resolved.end };
}
