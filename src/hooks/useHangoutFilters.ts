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

interface UseHangoutFiltersArgs {
  hangoutCategories: string[];
  hangoutTypesByCategory: Record<string, string[]>;
}

export function useHangoutFilters({
  hangoutCategories,
  hangoutTypesByCategory,
}: UseHangoutFiltersArgs) {
  const [filters, setFilters] = useState<HangoutTabFilters>(() => loadHangoutTabFilters());

  useEffect(() => {
    setFilters((prev) => {
      const next = sanitizeHangoutTabFilters(prev, hangoutCategories, hangoutTypesByCategory);
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
  }, [hangoutTypesByCategory, hangoutCategories]);

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
        if (type && !typeBelongsToHangoutCategory(type, category, hangoutTypesByCategory, hangoutCategories)) {
          type = '';
        }
        const next = { ...prev, category, type };
        saveHangoutTabFilters(next);
        return next;
      });
    },
    [hangoutTypesByCategory, hangoutCategories]
  );

  const setType = useCallback((type: string) => {
    setFilters((prev) => {
      const next = { ...prev, type };
      saveHangoutTabFilters(next);
      return next;
    });
  }, []);

  const categoryOptions = useMemo(
    () => getHangoutCategoryFilterOptions(hangoutCategories),
    [hangoutCategories]
  );

  const typeOptions = useMemo(
    () => getHangoutTypeFilterOptions(hangoutTypesByCategory, hangoutCategories, filters.category),
    [hangoutTypesByCategory, hangoutCategories, filters.category]
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
