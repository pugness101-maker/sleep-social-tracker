import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  defaultInsightsFilters,
  loadInsightsFilters,
  saveInsightsFilters,
  sanitizeInsightsFilters,
  type InsightsFilters,
} from '../lib/insights-filters';

export function useInsightsFilters() {
  const { data } = useApp();
  const catalog = data.hangoutTypesByCategory ?? {};
  const settingsCategories = data.hangoutCategories ?? [];

  const [filters, setFiltersState] = useState<InsightsFilters>(() =>
    sanitizeInsightsFilters(loadInsightsFilters(), settingsCategories, catalog)
  );

  useEffect(() => {
    setFiltersState((prev) => {
      const next = sanitizeInsightsFilters(prev, settingsCategories, catalog);
      return next;
    });
  }, [catalog, settingsCategories]);

  useEffect(() => {
    saveInsightsFilters(filters);
  }, [filters]);

  const setFilter = useCallback(<K extends keyof InsightsFilters>(key: K, value: InsightsFilters[K]) => {
    setFiltersState((prev) => sanitizeInsightsFilters({ ...prev, [key]: value }, settingsCategories, catalog));
  }, [catalog, settingsCategories]);

  const clearFilters = useCallback(() => {
    setFiltersState({ ...defaultInsightsFilters });
  }, []);

  const removeChip = useCallback((key: keyof InsightsFilters) => {
    setFiltersState((prev) => {
      const next =
        key === 'showSleep' || key === 'showNaps' || key === 'showHangouts' || key === 'showSegments'
          ? { ...prev, [key]: true }
          : { ...prev, [key]: typeof prev[key] === 'boolean' ? true : '' };
      return sanitizeInsightsFilters(next, settingsCategories, catalog);
    });
  }, [catalog, settingsCategories]);

  return { filters, setFilter, setFilters: setFiltersState, clearFilters, removeChip };
}
