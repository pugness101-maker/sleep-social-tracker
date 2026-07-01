import { Button } from '../ui/Button';
import { Input } from '../ui/FormFields';
import { Card } from '../ui/Card';
import {
  STATS_DATE_PRESETS,
  type StatsDatePreset,
  type StatsDateRange,
} from '../../lib/stats-date-range';

interface StatsDateRangeFilterProps {
  range: StatsDateRange;
  label: string;
  onPreset: (preset: StatsDatePreset) => void;
  onCustomDates: (startDate: string, endDate: string) => void;
  onClear: () => void;
}

export function StatsDateRangeFilter({
  range,
  label,
  onPreset,
  onCustomDates,
  onClear,
}: StatsDateRangeFilterProps) {
  return (
    <Card className="mb-6">
      <div className="space-y-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
              Date Range
            </h2>
            <p className="text-sm opacity-70 mt-1">{label}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClear}>
            {range.preset === 'all_time' ? 'All Time' : 'Clear Filter'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATS_DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                range.preset === preset.id ? 'bg-primary text-white border-primary' : ''
              }`}
              style={range.preset !== preset.id ? { borderColor: 'var(--border)' } : undefined}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
          <Input
            label="Start Date"
            type="date"
            value={range.startDate}
            disabled={range.preset !== 'custom'}
            onChange={(e) => onCustomDates(e.target.value, range.endDate || e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={range.endDate}
            disabled={range.preset !== 'custom'}
            onChange={(e) => onCustomDates(range.startDate || e.target.value, e.target.value)}
          />
        </div>

        {range.preset !== 'custom' && (
          <p className="text-xs opacity-60">
            Select Custom to edit start and end dates manually.
          </p>
        )}
      </div>
    </Card>
  );
}
