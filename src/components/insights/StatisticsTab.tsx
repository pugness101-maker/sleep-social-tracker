import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { buildStatisticsBundle } from '../../lib/statistics-analytics';
import { getFilteredInsightsData } from '../../lib/insights-filters';
import { resolveComparePresetRanges } from '../../lib/stats-compare-mode';
import { statsRangeArgs } from '../../hooks/useStatsDateRange';
import { useStatsCompareMode } from '../../hooks/useStatsCompareMode';
import { useInsightsFilters } from '../../hooks/useInsightsFilters';
import { useStatisticsAccordion } from '../../hooks/useStatisticsAccordion';
import { StatisticsCompareFilter } from './StatisticsCompareFilter';
import { InsightsFilterBar } from './InsightsFilterBar';
import { StatisticsCollapsibleSection } from './statistics/StatisticsCollapsibleSection';
import { StatisticsOverviewPanel } from './statistics/StatisticsOverviewPanel';
import { StatisticsSleepPanel } from './statistics/StatisticsSleepPanel';
import { StatisticsSocialPanel } from './statistics/StatisticsSocialPanel';
import { StatisticsCombinedPanel } from './statistics/StatisticsCombinedPanel';
import { StatisticsTrendsPanel } from './statistics/StatisticsTrendsPanel';

export function StatisticsTab() {
  const { data } = useApp();
  const accordion = useStatisticsAccordion();
  const compareMode = useStatsCompareMode();
  const { filters, setFilter, clearFilters, removeChip } = useInsightsFilters();

  const compareResolved = useMemo(() => {
    if (!compareMode.compareEnabled) return null;
    return resolveComparePresetRanges(
      compareMode.compareSettings.comparePreset,
      compareMode.compareSettings.rangeA,
      compareMode.compareSettings.rangeB
    );
  }, [
    compareMode.compareEnabled,
    compareMode.compareSettings.comparePreset,
    compareMode.compareSettings.rangeA,
    compareMode.compareSettings.rangeB,
  ]);

  const boundsA = compareMode.compareEnabled && compareResolved
    ? statsRangeArgs(compareResolved.a)
    : compareMode.singleBounds;
  const boundsB = compareMode.compareEnabled && compareResolved
    ? statsRangeArgs(compareResolved.b)
    : { start: undefined, end: undefined };

  const filteredDataA = useMemo(() => {
    const filtered = getFilteredInsightsData(data, filters, boundsA.start, boundsA.end);
    return { ...data, ...filtered };
  }, [data, filters, boundsA.start, boundsA.end]);

  const filteredDataB = useMemo(() => {
    if (!compareMode.compareEnabled) return null;
    const filtered = getFilteredInsightsData(data, filters, boundsB.start, boundsB.end);
    return { ...data, ...filtered };
  }, [data, filters, compareMode.compareEnabled, boundsB.start, boundsB.end]);

  const stats = useMemo(
    () => buildStatisticsBundle(filteredDataA, boundsA.start, boundsA.end),
    [filteredDataA, boundsA.start, boundsA.end]
  );

  const statsB = useMemo(
    () =>
      filteredDataB
        ? buildStatisticsBundle(filteredDataB, boundsB.start, boundsB.end)
        : null,
    [filteredDataB, boundsB.start, boundsB.end]
  );

  const compare = useMemo(() => {
    if (!compareMode.compareEnabled || !statsB || !compareMode.compareContext) return null;
    return {
      statsA: stats,
      statsB,
      labelA: compareMode.compareContext.labelA,
      labelB: compareMode.compareContext.labelB,
    };
  }, [compareMode.compareEnabled, compareMode.compareContext, stats, statsB]);

  const rangeLabel = compareMode.compareEnabled
    ? undefined
    : compareMode.singleResolved.isFiltered
      ? compareMode.singleResolved.label
      : undefined;

  return (
    <div className="space-y-4">
      <StatisticsCompareFilter
        mode={compareMode.compareSettings.mode}
        onModeChange={compareMode.setMode}
        comparePreset={compareMode.compareSettings.comparePreset}
        onComparePreset={compareMode.setComparePreset}
        rangeA={compareMode.compareSettings.rangeA}
        rangeB={compareMode.compareSettings.rangeB}
        onRangeACustom={compareMode.setRangeACustom}
        onRangeBCustom={compareMode.setRangeBCustom}
        singleRange={compareMode.singleRange}
        singleLabel={compareMode.singleResolved.label}
        onSinglePreset={compareMode.setSinglePreset}
        onSingleCustom={compareMode.setSingleCustom}
        onSingleClear={compareMode.clearSingle}
        labelA={compareResolved?.a.label}
        labelB={compareResolved?.b.label}
      />

      <Card>
        <InsightsFilterBar
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          removeChip={removeChip}
        />
      </Card>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={accordion.expandAll}>Expand All</Button>
        <Button size="sm" variant="ghost" onClick={accordion.collapseAll}>Collapse All</Button>
      </div>

      <div className="space-y-3">
        <StatisticsCollapsibleSection
          title="Overview"
          summary="High-level summary across sleep and social data"
          open={accordion.isTopOpen('overview')}
          onToggle={() => accordion.toggleTop('overview')}
        >
          <StatisticsOverviewPanel stats={stats} compare={compare} />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Sleep"
          summary="All sleep-related statistics, schedule, debt, naps, and charts"
          open={accordion.isTopOpen('sleep')}
          onToggle={() => accordion.toggleTop('sleep')}
        >
          <StatisticsSleepPanel
            stats={stats}
            data={filteredDataA}
            rangeStart={boundsA.start}
            rangeEnd={boundsA.end}
            rangeLabel={rangeLabel}
            accordion={accordion}
            compare={compare}
          />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Social"
          summary="Friends, hangouts, activities, people, locations, and charts"
          open={accordion.isTopOpen('social')}
          onToggle={() => accordion.toggleTop('social')}
        >
          <StatisticsSocialPanel stats={stats} accordion={accordion} compare={compare} />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Combined"
          summary="Sleep and social correlations and cross-system metrics"
          open={accordion.isTopOpen('combined')}
          onToggle={() => accordion.toggleTop('combined')}
        >
          <StatisticsCombinedPanel stats={stats} compare={compare} />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Trends"
          summary="Long-term sleep, social, and activity trends"
          open={accordion.isTopOpen('trends')}
          onToggle={() => accordion.toggleTop('trends')}
        >
          <StatisticsTrendsPanel stats={stats} compare={compare} />
        </StatisticsCollapsibleSection>
      </div>
    </div>
  );
}
