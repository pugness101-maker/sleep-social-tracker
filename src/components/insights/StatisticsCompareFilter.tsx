import { Button } from '../ui/Button';
import { Input } from '../ui/FormFields';
import { Card } from '../ui/Card';
import { STATS_DATE_PRESETS, type StatsDatePreset, type StatsDateRange } from '../../lib/stats-date-range';
import {
  COMPARE_PRESETS,
  type ComparePreset,
  type StatsCompareMode,
} from '../../lib/stats-compare-mode';

interface StatisticsCompareFilterProps {
  mode: StatsCompareMode;
  onModeChange: (mode: StatsCompareMode) => void;
  comparePreset: ComparePreset;
  onComparePreset: (preset: ComparePreset) => void;
  rangeA: StatsDateRange;
  rangeB: StatsDateRange;
  onRangeACustom: (start: string, end: string) => void;
  onRangeBCustom: (start: string, end: string) => void;
  singleRange: StatsDateRange;
  singleLabel: string;
  onSinglePreset: (preset: StatsDatePreset) => void;
  onSingleCustom: (start: string, end: string) => void;
  onSingleClear: () => void;
  labelA?: string;
  labelB?: string;
}

export function StatisticsCompareFilter({
  mode,
  onModeChange,
  comparePreset,
  onComparePreset,
  rangeA,
  rangeB,
  onRangeACustom,
  onRangeBCustom,
  singleRange,
  singleLabel,
  onSinglePreset,
  onSingleCustom,
  onSingleClear,
  labelA,
  labelB,
}: StatisticsCompareFilterProps) {
  const isCompare = mode === 'compare';

  return (
    <Card>
      <div className="space-y-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
              Date Range
            </h2>
            <p className="text-sm opacity-70 mt-1">
              {isCompare ? 'Compare two ranges side by side' : singleLabel}
            </p>
          </div>
          <div className="flex rounded-lg border overflow-hidden text-sm" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => onModeChange('single')}
              className={`px-3 py-1.5 transition-colors ${!isCompare ? 'bg-primary text-white' : ''}`}
            >
              Single Range
            </button>
            <button
              type="button"
              onClick={() => onModeChange('compare')}
              className={`px-3 py-1.5 transition-colors ${isCompare ? 'bg-primary text-white' : ''}`}
            >
              Compare Ranges
            </button>
          </div>
        </div>

        {isCompare ? (
          <>
            <div className="flex flex-wrap gap-2">
              {COMPARE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onComparePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    comparePreset === preset.id ? 'bg-primary text-white border-primary' : ''
                  }`}
                  style={comparePreset !== preset.id ? { borderColor: 'var(--border)' } : undefined}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Range A</p>
                {labelA && <p className="text-xs opacity-70">{labelA}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    label="Start"
                    type="date"
                    value={rangeA.startDate}
                    disabled={comparePreset !== 'custom'}
                    onChange={(e) => onRangeACustom(e.target.value, rangeA.endDate || e.target.value)}
                  />
                  <Input
                    label="End"
                    type="date"
                    value={rangeA.endDate}
                    disabled={comparePreset !== 'custom'}
                    onChange={(e) => onRangeACustom(rangeA.startDate || e.target.value, e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Range B</p>
                {labelB && <p className="text-xs opacity-70">{labelB}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    label="Start"
                    type="date"
                    value={rangeB.startDate}
                    disabled={comparePreset !== 'custom'}
                    onChange={(e) => onRangeBCustom(e.target.value, rangeB.endDate || e.target.value)}
                  />
                  <Input
                    label="End"
                    type="date"
                    value={rangeB.endDate}
                    disabled={comparePreset !== 'custom'}
                    onChange={(e) => onRangeBCustom(rangeB.startDate || e.target.value, e.target.value)}
                  />
                </div>
              </div>
            </div>
            {comparePreset !== 'custom' && (
              <p className="text-xs opacity-60">Select Custom Range A vs B to edit dates manually.</p>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {STATS_DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSinglePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    singleRange.preset === preset.id ? 'bg-primary text-white border-primary' : ''
                  }`}
                  style={singleRange.preset !== preset.id ? { borderColor: 'var(--border)' } : undefined}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
              <Input
                label="Start Date"
                type="date"
                value={singleRange.startDate}
                disabled={singleRange.preset !== 'custom'}
                onChange={(e) => onSingleCustom(e.target.value, singleRange.endDate || e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={singleRange.endDate}
                disabled={singleRange.preset !== 'custom'}
                onChange={(e) => onSingleCustom(singleRange.startDate || e.target.value, e.target.value)}
              />
            </div>
            <Button size="sm" variant="secondary" onClick={onSingleClear}>
              {singleRange.preset === 'all_time' ? 'All Time' : 'Clear Filter'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
