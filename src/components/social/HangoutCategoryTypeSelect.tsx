import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Select } from '../ui/FormFields';
import {
  getActiveTypeOptions,
  getDefaultTypeForCategory,
  isMixedHangoutCategory,
  isMixedHangoutMainType,
  resolveHangoutMainFields,
} from '../../lib/hangout-categories';
import { optionSelectOptions } from '../../lib/social-options';

interface HangoutCategoryTypeSelectProps {
  category: string;
  type: string;
  onCategoryChange?: (category: string) => void;
  onTypeChange?: (type: string) => void;
  /** Main hangout mode — single atomic update (avoids stale form state). */
  onMainFieldsChange?: (category: string, type: string) => void;
  categoryLabel?: string;
  typeLabel?: string;
  /** Main hangout: Mixed category hides type. Segments: exclude Mixed from categories. */
  mode?: 'main' | 'segment';
}

export function HangoutCategoryTypeSelect({
  category,
  type,
  onCategoryChange,
  onTypeChange,
  onMainFieldsChange,
  categoryLabel = 'Category',
  typeLabel = 'Type',
  mode = 'main',
}: HangoutCategoryTypeSelectProps) {
  const { data } = useApp();

  const catalog = data.hangoutTypesByCategory ?? {};
  const allCategories = data.hangoutCategories ?? [];

  const categoryOptions = useMemo(() => {
    const list =
      mode === 'segment'
        ? allCategories.filter((c) => !isMixedHangoutCategory(c))
        : allCategories;
    return optionSelectOptions(list, category);
  }, [allCategories, category, mode]);

  const typeOptions = useMemo(() => {
    return getActiveTypeOptions(catalog, allCategories, category);
  }, [catalog, allCategories, category]);

  const isMixedMain = mode === 'main' && isMixedHangoutCategory(category);

  const applyMainFields = (nextCategory: string, nextType: string) => {
    const resolved = resolveHangoutMainFields(nextCategory, nextType, catalog, allCategories);
    if (onMainFieldsChange) {
      onMainFieldsChange(resolved.category, resolved.type);
      return;
    }
    onCategoryChange?.(resolved.category);
    onTypeChange?.(resolved.type);
  };

  const handleCategoryChange = (nextCategory: string) => {
    if (mode === 'main') {
      applyMainFields(nextCategory, type);
      return;
    }
    onCategoryChange?.(nextCategory);
    const types = getActiveTypeOptions(catalog, allCategories, nextCategory);
    if (!types.includes(type) || isMixedHangoutMainType(type)) {
      onTypeChange?.(getDefaultTypeForCategory(catalog, nextCategory));
    }
  };

  const handleTypeChange = (nextType: string) => {
    if (mode === 'main') {
      applyMainFields(category, nextType);
      return;
    }
    onTypeChange?.(nextType);
  };

  return (
    <>
      <Select
        label={categoryLabel}
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        options={categoryOptions}
      />
      {!isMixedMain && (
        <Select
          label={typeLabel}
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          options={optionSelectOptions(typeOptions, type)}
        />
      )}
    </>
  );
}
