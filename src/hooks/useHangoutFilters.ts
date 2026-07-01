import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getHangoutCategoryFilterOptions,
  getHangoutTypeFilterOptions,
  loadHangoutTabFilters,
  saveHangoutTabFilters,
  sanitizeHangoutTabFilters,
  type HangoutTabFilters,
  typeBelongsToHangoutCategory,
} from '../lib/hangout-filters';
import type { Hangout } from '../types';

interface UseHangoutFiltersArgs {
  hangoutCategories: string[];
  hangoutTypesByCategory: Record<string, string[]>;
  hangoutTypes: string[];
  hangouts: Hangout[];
}

export function useHangoutFilters({
  hangoutCategories,
  hangoutTypesByCategory,
  hangoutTypes,
  hangouts,
}: UseHangoutFiltersArgs) {
  const [filters, setFilters] = useState<HangoutTabFilters>(() => loadHangoutTabFilters());

  useEffect(() => {
    setFilters((prev) => {
      const next = sanitizeHangoutTabFilters(prev, hangoutCategories, hangouts, hangoutTypesByCategory);
      if (
        next.category !== prev.category ||
        next.type !== prev.type ||
        next.location !== prev.location ||
        next.search !== prev.search
      ) {
        saveHangoutTabFilters(next);
        return next;
      }
      return prev;
    });
  }, [hangouts, hangoutTypesByCategory, hangoutCategories]);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => {
      const next = { ...prev, search };
      saveHangoutTabFilters(next);
      return next;
    });
  }, []);

  const setLocation = useCallback((location: string) => {
    setFilters((prev) => {
      const next = { ...prev, location };
      saveHangoutTabFilters(next);
      return next;
    });
  }, []);

  const setCategory = useCallback(
    (category: string) => {
      setFilters((prev) => {
        let type = prev.type;
        if (category && type && !typeBelongsToHangoutCategory(type, category, hangouts, hangoutTypesByCategory)) {
          type = '';
        }
        const next = { ...prev, category, type };
        saveHangoutTabFilters(next);
        return next;
      });
    },
    [hangouts, hangoutTypesByCategory]
  );

  const setType = useCallback((type: string) => {
    setFilters((prev) => {
      const next = { ...prev, type };
      saveHangoutTabFilters(next);
      return next;
    });
  }, []);

  const categoryOptions = useMemo(
    () => getHangoutCategoryFilterOptions(hangoutCategories, hangouts),
    [hangoutCategories, hangouts]
  );

  const typeOptions = useMemo(
    () => getHangoutTypeFilterOptions(hangouts, hangoutTypesByCategory, hangoutTypes, filters.category),
    [hangouts, hangoutTypesByCategory, hangoutTypes, filters.category]
  );

  return {
    filters,
    setSearch,
    setCategory,
    setType,
    setLocation,
    categoryOptions,
    typeOptions,
  };
}
