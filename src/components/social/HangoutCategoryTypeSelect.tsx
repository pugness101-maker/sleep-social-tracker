import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Select } from '../ui/FormFields';
import { getDefaultTypeForCategory, typesForCategory } from '../../lib/hangout-categories';
import { optionSelectOptions } from '../../lib/social-options';

interface HangoutCategoryTypeSelectProps {
  category: string;
  type: string;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  categoryLabel?: string;
  typeLabel?: string;
}

export function HangoutCategoryTypeSelect({
  category,
  type,
  onCategoryChange,
  onTypeChange,
  categoryLabel = 'Category',
  typeLabel = 'Type',
}: HangoutCategoryTypeSelectProps) {
  const { data } = useApp();

  const catalog = data.hangoutTypesByCategory ?? {};
  const categories = data.hangoutCategories ?? [];

  const typeOptions = useMemo(() => {
    const list = typesForCategory(catalog, category);
    if (list.length === 0) return data.hangoutTypes;
    return list;
  }, [catalog, category, data.hangoutTypes]);

  const handleCategoryChange = (nextCategory: string) => {
    onCategoryChange(nextCategory);
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
        options={optionSelectOptions(categories, category)}
      />
      <Select
        label={typeLabel}
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        options={optionSelectOptions(typeOptions, type)}
      />
    </>
  );
}
