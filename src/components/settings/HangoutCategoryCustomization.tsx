import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomOptionListCard } from './CustomOptionListCard';
import { Select } from '../ui/FormFields';
import {
  countHangoutsWithCategory,
  countHangoutsWithCategoryType,
  typesForCategory,
  DEFAULT_HANGOUT_CATEGORY,
  isMixedHangoutCategory,
} from '../../lib/hangout-categories';
import { getCategoryUsage, getCategoryTypeUsage } from '../../lib/social-customization-usage';

export function HangoutCategoryCustomization() {
  const {
    data,
    addHangoutCategory,
    updateHangoutCategory,
    deleteHangoutCategory,
    addTypeToCategory,
    updateTypeInCategory,
    deleteTypeFromCategory,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState(data.hangoutCategories[0] ?? DEFAULT_HANGOUT_CATEGORY);
  const types = typesForCategory(data.hangoutTypesByCategory, selectedCategory);
  const usageData = { friends: data.friends, hangouts: data.hangouts, ideas: data.ideas };

  return (
    <div className="space-y-4">
      <CustomOptionListCard
        title="Hangout Categories"
        description="Top-level hangout classification. Types belong to a category."
        options={data.hangoutCategories}
        usageCount={(name) => countHangoutsWithCategory(data.hangouts, name)}
        getUsageLog={(category) => getCategoryUsage(usageData, category)}
        defaultFallbackLabel={DEFAULT_HANGOUT_CATEGORY}
        deleteMode="hangout"
        onAdd={addHangoutCategory}
        onEdit={updateHangoutCategory}
        onDelete={(name, action, otherName) => {
          if (action === 'default') deleteHangoutCategory(name, { action: 'default' });
          else if (action === 'other' && otherName) deleteHangoutCategory(name, { action: 'other', name: otherName });
          else deleteHangoutCategory(name, { action: 'default' });
        }}
      />

      <div className="space-y-2">
        <Select
          label="Edit types for category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={data.hangoutCategories.map((c) => ({ value: c, label: c }))}
        />
        {isMixedHangoutCategory(selectedCategory) ? (
          <p className="text-sm opacity-70 text-left">
            Mixed is a special category with no types. Use Activity Segments on each hangout to break down activities by category and type.
          </p>
        ) : (
          <CustomOptionListCard
          title={`Types in ${selectedCategory}`}
          description="Activity types within the selected category."
          options={types}
          usageCount={(name) => countHangoutsWithCategoryType(data.hangouts, selectedCategory, name)}
          getUsageLog={(type) => getCategoryTypeUsage(usageData, selectedCategory, type)}
          defaultFallbackLabel="Other"
          deleteMode="hangout"
          onAdd={(name) => addTypeToCategory(selectedCategory, name)}
          onEdit={(oldName, newName) => updateTypeInCategory(selectedCategory, oldName, newName)}
          onDelete={(name, action, otherName) => {
            if (action === 'default') deleteTypeFromCategory(selectedCategory, name, { action: 'default' });
            else if (action === 'other' && otherName) deleteTypeFromCategory(selectedCategory, name, { action: 'other', name: otherName });
            else deleteTypeFromCategory(selectedCategory, name, { action: 'default' });
          }}
        />
        )}
      </div>
    </div>
  );
}
