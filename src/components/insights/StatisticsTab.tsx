import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { buildStatisticsBundle } from '../../lib/statistics-analytics';
import { useStatsDateRange, statsRangeArgs } from '../../hooks/useStatsDateRange';
import { useInsightsFilters } from '../../hooks/useInsightsFilters';
import { useStatisticsAccordion } from '../../hooks/useStatisticsAccordion';
import { StatsDateRangeFilter } from './StatsDateRangeFilter';
import { InsightsFilterBar, useFilteredAppData } from './InsightsFilterBar';
import { StatisticsCollapsibleSection } from './statistics/StatisticsCollapsibleSection';
import { StatisticsOverviewPanel } from './statistics/StatisticsOverviewPanel';
import { StatisticsSleepPanel } from './statistics/StatisticsSleepPanel';
import { StatisticsSocialPanel } from './statistics/StatisticsSocialPanel';
import { StatisticsCombinedPanel } from './statistics/StatisticsCombinedPanel';
import { StatisticsTrendsPanel } from './statistics/StatisticsTrendsPanel';

export function StatisticsTab() {
  const { data } = useApp();
  const accordion = useStatisticsAccordion();
  const { range, resolved, setPreset, setCustomDates, clearFilter } = useStatsDateRange();
  const { filters, setFilter, clearFilters, removeChip } = useInsightsFilters();
  const { start, end } = statsRangeArgs(resolved);

  const filteredData = useFilteredAppData(data, filters, start, end);

  const stats = useMemo(
    () => buildStatisticsBundle(filteredData, start, end),
    [filteredData, start, end]
  );

  return (
    <div className="space-y-4">
      <StatsDateRangeFilter
        range={range}
        label={resolved.label}
        onPreset={setPreset}
        onCustomDates={setCustomDates}
        onClear={clearFilter}
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
          <StatisticsOverviewPanel stats={stats} />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Sleep"
          summary="All sleep-related statistics, schedule, debt, naps, and charts"
          open={accordion.isTopOpen('sleep')}
          onToggle={() => accordion.toggleTop('sleep')}
        >
          <StatisticsSleepPanel
            stats={stats}
            data={filteredData}
            rangeStart={start}
            rangeEnd={end}
            rangeLabel={resolved.isFiltered ? resolved.label : undefined}
            accordion={accordion}
          />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Social"
          summary="Friends, hangouts, activities, people, locations, and charts"
          open={accordion.isTopOpen('social')}
          onToggle={() => accordion.toggleTop('social')}
        >
          <StatisticsSocialPanel stats={stats} accordion={accordion} />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Combined"
          summary="Sleep and social correlations and cross-system metrics"
          open={accordion.isTopOpen('combined')}
          onToggle={() => accordion.toggleTop('combined')}
        >
          <StatisticsCombinedPanel stats={stats} />
        </StatisticsCollapsibleSection>

        <StatisticsCollapsibleSection
          title="Trends"
          summary="Long-term sleep, social, and activity trends"
          open={accordion.isTopOpen('trends')}
          onToggle={() => accordion.toggleTop('trends')}
        >
          <StatisticsTrendsPanel stats={stats} />
        </StatisticsCollapsibleSection>
      </div>
    </div>
  );
}
