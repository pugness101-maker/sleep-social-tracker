import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import {
  mergeBreakdownCompare,
  mergeFriendRankingCompare,
  SOCIAL_CHART_METRICS,
  SOCIAL_FRIENDS_METRICS,
  SOCIAL_HANGOUT_METRICS,
  SOCIAL_LOCATION_METRICS,
  SOCIAL_PEOPLE_METRICS,
} from '../../../lib/statistics-compare';
import { StatisticsCollapsibleSection } from './StatisticsCollapsibleSection';
import {
  AdaptiveMetrics,
  CompareBreakdownTable,
  CompareStatGrid,
  type StatisticsCompareProps,
} from './CompareStatGrid';
import { BarChart, HorizontalBarList, RankingList } from './SimpleCharts';
import type { useStatisticsAccordion } from '../../../hooks/useStatisticsAccordion';

type Accordion = ReturnType<typeof useStatisticsAccordion>;

export function StatisticsSocialPanel({
  stats,
  accordion,
  compare,
}: {
  stats: StatisticsBundle;
  accordion: Accordion;
  compare?: StatisticsCompareProps | null;
}) {
  const a = stats.social.activities;
  const p = stats.social.people;
  const l = stats.social.locations;
  const inCompare = Boolean(compare);

  return (
    <div className="space-y-3">
      <StatisticsCollapsibleSection
        title="Friends"
        summary="Friend counts, new friends, and recent activity"
        open={accordion.isSocialOpen('friends')}
        onToggle={() => accordion.toggleSocial('friends')}
        nested
      >
        <AdaptiveMetrics metrics={SOCIAL_FRIENDS_METRICS} stats={stats} compare={compare ?? null} columns={3} />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Hangouts"
        summary="Totals, weekly/monthly hours, and duration extremes"
        open={accordion.isSocialOpen('hangouts')}
        onToggle={() => accordion.toggleSocial('hangouts')}
        nested
      >
        <AdaptiveMetrics metrics={SOCIAL_HANGOUT_METRICS} stats={stats} compare={compare ?? null} columns={3} />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Activities"
        summary="Category and type breakdowns"
        open={accordion.isSocialOpen('activities')}
        onToggle={() => accordion.toggleSocial('activities')}
        nested
      >
        {inCompare && compare ? (
          <div className="grid lg:grid-cols-2 gap-3">
            <CompareBreakdownTable
              title="Category Breakdown"
              rows={mergeBreakdownCompare('cat', compare.statsA.social.activities.byCategory, compare.statsB.social.activities.byCategory)}
              labelA={compare.labelA}
              labelB={compare.labelB}
            />
            <CompareBreakdownTable
              title="Type Breakdown"
              rows={mergeBreakdownCompare('type', compare.statsA.social.activities.byType, compare.statsB.social.activities.byType)}
              labelA={compare.labelA}
              labelB={compare.labelB}
            />
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-3 mb-3">
              <div className="text-sm">
                <span className="opacity-70">Most Common Occasion: </span>
                <strong>{a.topOccasion ?? '—'}</strong>
              </div>
              <div className="text-sm">
                <span className="opacity-70">Most Common Category: </span>
                <strong>{a.topCategory ?? '—'}</strong>
              </div>
              <div className="text-sm">
                <span className="opacity-70">Most Common Type: </span>
                <strong>{a.topType ?? '—'}</strong>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-3">
              <HorizontalBarList title="Occasion Breakdown" data={a.byOccasion} />
              <HorizontalBarList title="Category Breakdown" data={a.byCategory} />
              <HorizontalBarList title="Type Breakdown" data={a.byType} />
            </div>
          </>
        )}
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="People"
        summary="Friend rankings, time together, and hangout style"
        open={accordion.isSocialOpen('people')}
        onToggle={() => accordion.toggleSocial('people')}
        nested
      >
        <AdaptiveMetrics metrics={SOCIAL_PEOPLE_METRICS} stats={stats} compare={compare ?? null} columns={2} />
        {inCompare && compare ? (
          <CompareBreakdownTable
            title="Friend Activity"
            rows={mergeFriendRankingCompare(compare.statsA, compare.statsB)}
            labelA={compare.labelA}
            labelB={compare.labelB}
          />
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-3">
              <RankingList
                title="Most Seen Friends"
                rows={p.mostSeen.map((r) => ({
                  name: r.name,
                  primary: `${r.hangouts} hangouts`,
                  secondary: `${r.hours.toFixed(1)}h`,
                }))}
              />
              <RankingList
                title="Least Seen Friends"
                rows={p.leastSeen.map((r) => ({
                  name: r.name,
                  primary: `${r.hangouts} hangouts`,
                  secondary: `${r.hours.toFixed(1)}h`,
                }))}
              />
            </div>
            <RankingList
              title="Friend Ranking"
              rows={p.ranking.slice(0, 10).map((r) => ({
                name: r.name,
                primary: `${r.hangouts} hangouts`,
                secondary: `${r.hours.toFixed(1)}h total`,
              }))}
            />
            <RankingList
              title="Time With Each Friend"
              rows={[...p.ranking]
                .sort((x, y) => y.hours - x.hours)
                .slice(0, 10)
                .map((r) => ({
                  name: r.name,
                  primary: `${r.hours.toFixed(1)}h`,
                  secondary: `${r.hangouts} hangouts`,
                }))}
            />
          </>
        )}
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Locations"
        summary="Most visited places and favorites"
        open={accordion.isSocialOpen('locations')}
        onToggle={() => accordion.toggleSocial('locations')}
        nested
      >
        <AdaptiveMetrics metrics={SOCIAL_LOCATION_METRICS} stats={stats} compare={compare ?? null} columns={2} />
        {inCompare && compare ? (
          <div className="grid lg:grid-cols-2 gap-3">
            <CompareBreakdownTable
              title="Most Visited Locations"
              rows={mergeBreakdownCompare('loc', compare.statsA.social.locations.topLocations, compare.statsB.social.locations.topLocations)}
              labelA={compare.labelA}
              labelB={compare.labelB}
            />
            <CompareBreakdownTable
              title="Favorite Restaurants"
              rows={mergeBreakdownCompare('rest', compare.statsA.social.locations.favoriteRestaurants, compare.statsB.social.locations.favoriteRestaurants)}
              labelA={compare.labelA}
              labelB={compare.labelB}
            />
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-3">
              <HorizontalBarList title="Most Visited Locations" data={l.topLocations} />
              <HorizontalBarList
                title="Favorite Restaurants"
                data={l.favoriteRestaurants}
                emptyMessage="No food-location hangouts in this range."
              />
            </div>
            <HorizontalBarList
              title="Favorite Hangout Spots"
              data={l.favoriteSpots.map((x) => ({ label: x.label, value: x.value }))}
              formatValue={(v) => `${v.toFixed(1)}h`}
            />
          </>
        )}
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Charts"
        summary="Social hours and activity visualizations"
        open={accordion.isSocialOpen('charts')}
        onToggle={() => accordion.toggleSocial('charts')}
        nested
      >
        {inCompare && compare ? (
          <>
            <CompareStatGrid
              metrics={SOCIAL_CHART_METRICS}
              statsA={compare.statsA}
              statsB={compare.statsB}
              labelA={compare.labelA}
              labelB={compare.labelB}
            />
            <div className="grid lg:grid-cols-2 gap-3 mt-3">
              <CompareBreakdownTable
                title="Activity by Type"
                rows={mergeBreakdownCompare('chartType', compare.statsA.social.activities.byType, compare.statsB.social.activities.byType)}
                labelA={compare.labelA}
                labelB={compare.labelB}
              />
              <CompareBreakdownTable
                title="Activity by Category"
                rows={mergeBreakdownCompare('chartCat', compare.statsA.social.activities.byCategory, compare.statsB.social.activities.byCategory)}
                labelA={compare.labelA}
                labelB={compare.labelB}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-3">
              <BarChart title="Hours by Week" data={stats.social.hoursByWeek} valueSuffix="h" colorClass="bg-social/60" />
              <BarChart title="Hours by Month" data={stats.social.hoursByMonth} valueSuffix="h" colorClass="bg-social/60" />
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
              <HorizontalBarList
                title="Friend Ranking Graph"
                data={p.ranking.slice(0, 8).map((r) => ({ label: r.name, value: r.hangouts }))}
              />
              <HorizontalBarList title="Activity Pie (by Type)" data={a.byType.slice(0, 8)} />
            </div>
            <HorizontalBarList title="Category Bar Chart" data={a.byCategory} />
          </>
        )}
      </StatisticsCollapsibleSection>
    </div>
  );
}
