import { useCallback, useEffect, useState } from 'react';
import {
  defaultInsightsFilters,
  loadInsightsFilters,
  saveInsightsFilters,
  type InsightsFilters,
} from '../lib/insights-filters';

export function useInsightsFilters() {
  const [filters, setFiltersState] = useState<InsightsFilters>(() => loadInsightsFilters());

  useEffect(() => {
    saveInsightsFilters(filters);
  }, [filters]);

  const setFilter = useCallback(<K extends keyof InsightsFilters>(key: K, value: InsightsFilters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({ ...defaultInsightsFilters });
  }, []);

  const removeChip = useCallback((key: keyof InsightsFilters) => {
    setFiltersState((prev) => {
      if (key === 'showSleep' || key === 'showNaps' || key === 'showHangouts' || key === 'showSegments') {
        return { ...prev, [key]: true };
      }
      return { ...prev, [key]: typeof prev[key] === 'boolean' ? true : '' };
    });
  }, []);

  return { filters, setFilter, setFilters: setFiltersState, clearFilters, removeChip };
}
