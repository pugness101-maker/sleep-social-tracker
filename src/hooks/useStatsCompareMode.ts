import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  comparePresetToStoredRanges,
  loadStatsCompareSettings,
  resolveComparePresetRanges,
  saveStatsCompareSettings,
  type ComparePreset,
  type StatsCompareMode,
  type StatsCompareSettings,
} from '../lib/stats-compare-mode';
import {
  defaultStatsDateRange,
  loadStatsDateRange,
  resolveStatsDateRange,
  saveStatsDateRange,
  presetToStoredRange,
  type StatsDatePreset,
  type StatsDateRange,
} from '../lib/stats-date-range';
import { statsRangeArgs } from './useStatsDateRange';

export interface StatisticsCompareContext {
  enabled: boolean;
  labelA: string;
  labelB: string;
  startA?: Date;
  endA?: Date;
  startB?: Date;
  endB?: Date;
}

export function useStatsCompareMode() {
  const [compareSettings, setCompareSettings] = useState<StatsCompareSettings>(() => loadStatsCompareSettings());
  const [singleRange, setSingleRange] = useState<StatsDateRange>(() => loadStatsDateRange());

  useEffect(() => {
    saveStatsCompareSettings(compareSettings);
  }, [compareSettings]);

  useEffect(() => {
    if (compareSettings.mode === 'single') {
      saveStatsDateRange(singleRange);
    }
  }, [singleRange, compareSettings.mode]);

  const compareEnabled = compareSettings.mode === 'compare';

  const singleResolved = useMemo(() => resolveStatsDateRange(singleRange), [singleRange]);

  const compareResolved = useMemo(() => {
    if (!compareEnabled) return null;
    return resolveComparePresetRanges(
      compareSettings.comparePreset,
      compareSettings.rangeA,
      compareSettings.rangeB
    );
  }, [compareEnabled, compareSettings.comparePreset, compareSettings.rangeA, compareSettings.rangeB]);

  const setMode = useCallback((mode: StatsCompareMode) => {
    setCompareSettings((prev) => {
      if (mode === 'compare' && prev.mode === 'single') {
        const ranges = comparePresetToStoredRanges(prev.comparePreset);
        return { ...prev, mode, ...ranges };
      }
      return { ...prev, mode };
    });
  }, []);

  const setComparePreset = useCallback((preset: ComparePreset) => {
    const ranges = comparePresetToStoredRanges(preset);
    setCompareSettings((prev) => ({ ...prev, comparePreset: preset, ...ranges }));
  }, []);

  const setRangeACustom = useCallback((startDate: string, endDate: string) => {
    setCompareSettings((prev) => ({
      ...prev,
      comparePreset: 'custom',
      rangeA: { preset: 'custom', startDate, endDate },
    }));
  }, []);

  const setRangeBCustom = useCallback((startDate: string, endDate: string) => {
    setCompareSettings((prev) => ({
      ...prev,
      comparePreset: 'custom',
      rangeB: { preset: 'custom', startDate, endDate },
    }));
  }, []);

  const setSinglePreset = useCallback((preset: StatsDatePreset) => {
    setSingleRange(presetToStoredRange(preset));
  }, []);

  const setSingleCustom = useCallback((startDate: string, endDate: string) => {
    setSingleRange({ preset: 'custom', startDate, endDate });
  }, []);

  const clearSingle = useCallback(() => {
    setSingleRange({ ...defaultStatsDateRange });
  }, []);

  const compareContext: StatisticsCompareContext | null = useMemo(() => {
    if (!compareEnabled || !compareResolved) return null;
    const { a, b } = compareResolved;
    return {
      enabled: true,
      labelA: a.label.replace(/^Range A: /, ''),
      labelB: b.label.replace(/^Range B: /, ''),
      startA: a.start ?? undefined,
      endA: a.end ?? undefined,
      startB: b.start ?? undefined,
      endB: b.end ?? undefined,
    };
  }, [compareEnabled, compareResolved]);

  const singleBounds = statsRangeArgs(singleResolved);

  return {
    compareEnabled,
    compareSettings,
    singleRange,
    singleResolved,
    singleBounds,
    compareContext,
    setMode,
    setComparePreset,
    setRangeACustom,
    setRangeBCustom,
    setSinglePreset,
    setSingleCustom,
    clearSingle,
  };
}

export type { StatsCompareSettings };
