import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getHangoutCategoryFilterOptions,
  getHangoutOccasionFilterOptions,
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
  hangoutOccasions: string[];
}

export function useHangoutFilters({
  hangoutCategories,
  hangoutTypesByCategory,
  hangoutOccasions,
}: UseHangoutFiltersArgs) {
  const [filters, setFilters] = useState<HangoutTabFilters>(() => loadHangoutTabFilters());

  useEffect(() => {
    setFilters((prev) => {
      const next = sanitizeHangoutTabFilters(prev, hangoutCategories, hangoutTypesByCategory, hangoutOccasions);
      if (
        next.category !== prev.category ||
        next.type !== prev.type ||
        next.occasion !== prev.occasion ||
        next.location !== prev.location ||
        next.search !== prev.search
      ) {
        saveHangoutTabFilters(next);
        return next;
      }
      return prev;
    });
  }, [hangoutTypesByCategory, hangoutCategories, hangoutOccasions]);

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

  const setOccasion = useCallback((occasion: string) => {
    setFilters((prev) => {
      const next = { ...prev, occasion };
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

  const occasionOptions = useMemo(
    () => getHangoutOccasionFilterOptions(hangoutOccasions),
    [hangoutOccasions]
  );

  const typeOptions = useMemo(
    () => getHangoutTypeFilterOptions(hangoutTypesByCategory, hangoutCategories, filters.category),
    [hangoutTypesByCategory, hangoutCategories, filters.category]
  );

  return {
    filters,
    setSearch,
    setOccasion,
    setCategory,
    setType,
    setLocation,
    categoryOptions,
    occasionOptions,
    typeOptions,
  };
}
