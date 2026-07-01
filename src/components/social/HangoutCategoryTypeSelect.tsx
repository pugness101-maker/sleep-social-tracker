import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Select } from '../ui/FormFields';
import {
  filterTypesForDropdown,
  getDefaultTypeForCategory,
  isMixedHangoutCategory,
  MIXED_HANGOUT_MAIN_TYPE,
  typesForCategory,
} from '../../lib/hangout-categories';
import { optionSelectOptions } from '../../lib/social-options';

interface HangoutCategoryTypeSelectProps {
  category: string;
  type: string;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
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
    const list = typesForCategory(catalog, category);
    const source = list.length === 0 ? filterTypesForDropdown(data.hangoutTypes) : list;
    return filterTypesForDropdown(source);
  }, [catalog, category, data.hangoutTypes]);

  const isMixedMain = mode === 'main' && isMixedHangoutCategory(category);

  const handleCategoryChange = (nextCategory: string) => {
    onCategoryChange(nextCategory);
    if (isMixedHangoutCategory(nextCategory)) {
      onTypeChange(MIXED_HANGOUT_MAIN_TYPE);
      return;
    }
    const types = typesForCategory(catalog, nextCategory);
    if (!types.includes(type)) {
      onTypeChange(getDefaultTypeForCategory(catalog, nextCategory));
    }
  };

  return (
    <>
      <Select
        label={categoryLabel}
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        options={categoryOptions}
      />
      {isMixedMain ? (
        <div className="text-left">
          <p className="text-sm font-medium mb-1">{typeLabel}</p>
          <p className="text-sm opacity-70 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
            Mixed — add Activity Segments for each activity type
          </p>
        </div>
      ) : (
        <Select
          label={typeLabel}
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          options={optionSelectOptions(typeOptions, type)}
        />
      )}
    </>
  );
}
