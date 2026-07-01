import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/FormFields';
import {
  findRetiredTypeUsage,
  getActiveTypeOptions,
  getDefaultTypeForCategory,
  typesForCategory,
} from '../../lib/hangout-categories';

export function RetiredTypeMigrationPrompt() {
  const { data, resolveRetiredHangoutType } = useApp();
  const pending = useMemo(() => findRetiredTypeUsage(data), [data]);
  const [current, setCurrent] = useState(pending[0] ?? null);
  const [mode, setMode] = useState<'replace' | 'move_other'>('replace');
  const [replacementType, setReplacementType] = useState('');
  const [otherType, setOtherType] = useState('');

  useEffect(() => {
    setCurrent(pending[0] ?? null);
  }, [pending]);

  useEffect(() => {
    if (!current) return;
    const sameCategoryTypes = getActiveTypeOptions(
      data.hangoutTypesByCategory,
      data.hangoutCategories,
      current.category
    );
    setMode('replace');
    setReplacementType(
      sameCategoryTypes[0] ??
        getDefaultTypeForCategory(data.hangoutTypesByCategory, current.category)
    );
    const otherTypes = typesForCategory(data.hangoutTypesByCategory, 'Other');
    setOtherType(otherTypes[0] ?? getDefaultTypeForCategory(data.hangoutTypesByCategory, 'Other'));
  }, [current, data.hangoutCategories, data.hangoutTypesByCategory]);

  if (!current) return null;

  const sameCategoryTypes = getActiveTypeOptions(
    data.hangoutTypesByCategory,
    data.hangoutCategories,
    current.category
  );
  const otherTypes = typesForCategory(data.hangoutTypesByCategory, 'Other');
  const usageParts: string[] = [];
  if (current.hangouts > 0) usageParts.push(`${current.hangouts} hangout${current.hangouts === 1 ? '' : 's'}`);
  if (current.segments > 0) usageParts.push(`${current.segments} segment${current.segments === 1 ? '' : 's'}`);
  if (current.ideas > 0) usageParts.push(`${current.ideas} idea${current.ideas === 1 ? '' : 's'}`);
  if (current.includesActiveTimer) usageParts.push('active timer');

  const handleApply = () => {
    if (mode === 'replace') {
      if (!replacementType) return;
      resolveRetiredHangoutType(current.category, current.type, {
        action: 'replace',
        category: current.category,
        type: replacementType,
      });
    } else {
      if (!otherType) return;
      resolveRetiredHangoutType(current.category, current.type, {
        action: 'move_other',
        type: otherType,
      });
    }
  };

  return (
    <Modal
      open
      onClose={() => {}}
      title="Update removed hangout type"
    >
      <div className="space-y-4 text-left">
        <p className="text-sm opacity-80">
          The type <strong>{current.type}</strong> in <strong>{current.category}</strong> is no longer
          available. {usageParts.length > 0 ? `${usageParts.join(', ')} still use it.` : ''} Choose how
          to update those records.
        </p>
        {pending.length > 1 && (
          <p className="text-xs opacity-60">
            {pending.length - 1} more removed type{pending.length - 1 === 1 ? '' : 's'} to review after this one.
          </p>
        )}

        <fieldset className="space-y-2">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="retired-type-mode"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
              className="mt-1"
            />
            <span>
              Replace with another type in {current.category}
              {mode === 'replace' && (
                <div className="mt-2">
                  <Select
                    label=""
                    value={replacementType}
                    onChange={(e) => setReplacementType(e.target.value)}
                    options={sameCategoryTypes.map((t) => ({ value: t, label: t }))}
                  />
                </div>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="retired-type-mode"
              checked={mode === 'move_other'}
              onChange={() => setMode('move_other')}
              className="mt-1"
            />
            <span>
              Move to Other
              {mode === 'move_other' && (
                <div className="mt-2">
                  <Select
                    label=""
                    value={otherType}
                    onChange={(e) => setOtherType(e.target.value)}
                    options={otherTypes.map((t) => ({ value: t, label: t }))}
                  />
                </div>
              )}
            </span>
          </label>
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}
