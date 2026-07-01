import { formatDuration } from '../../../lib/dates';
import type { StatisticsBundle } from '../../../lib/statistics-analytics';
import { StatisticsCollapsibleSection } from './StatisticsCollapsibleSection';
import { StatGrid } from './StatGrid';
import { BarChart, HorizontalBarList, RankingList } from './SimpleCharts';
import type { useStatisticsAccordion } from '../../../hooks/useStatisticsAccordion';

type Accordion = ReturnType<typeof useStatisticsAccordion>;

export function StatisticsSocialPanel({
  stats,
  accordion,
}: {
  stats: StatisticsBundle;
  accordion: Accordion;
}) {
  const f = stats.social.friends;
  const h = stats.social.hangouts;
  const a = stats.social.activities;
  const p = stats.social.people;
  const l = stats.social.locations;

  return (
    <div className="space-y-3">
      <StatisticsCollapsibleSection
        title="Friends"
        summary="Friend counts, new friends, and recent activity"
        open={accordion.isSocialOpen('friends')}
        onToggle={() => accordion.toggleSocial('friends')}
        nested
      >
        <StatGrid
          columns={3}
          items={[
            { label: 'Total Friends', value: String(f.total), accent: 'social' },
            { label: 'Active Friends', value: String(f.active), accent: 'social' },
            { label: 'Archived Friends', value: String(f.archived), accent: 'social' },
            { label: 'New Friends', value: String(f.newInRange), accent: 'social' },
            { label: 'Friends Seen This Month', value: String(f.seenThisMonth), accent: 'social' },
            { label: 'Friends Not Seen Recently', value: String(f.notSeenRecently), sub: '30+ days', accent: 'social' },
          ]}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Hangouts"
        summary="Totals, weekly/monthly hours, and duration extremes"
        open={accordion.isSocialOpen('hangouts')}
        onToggle={() => accordion.toggleSocial('hangouts')}
        nested
      >
        <StatGrid
          columns={3}
          items={[
            { label: 'Total Hangouts', value: String(h.total), accent: 'social' },
            { label: 'Hours This Week', value: `${h.hoursThisWeek.toFixed(1)}h`, accent: 'social' },
            { label: 'Hours This Month', value: `${h.hoursThisMonth.toFixed(1)}h`, accent: 'social' },
            { label: 'Average Duration', value: formatDuration(h.avgDuration), accent: 'social' },
            { label: 'Longest Hangout', value: formatDuration(h.longest), accent: 'social' },
            { label: 'Shortest Hangout', value: formatDuration(h.shortest), accent: 'social' },
          ]}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Activities"
        summary="Category and type breakdowns"
        open={accordion.isSocialOpen('activities')}
        onToggle={() => accordion.toggleSocial('activities')}
        nested
      >
        <StatGrid
          columns={2}
          items={[
            { label: 'Most Common Category', value: a.topCategory ?? '—', accent: 'social' },
            { label: 'Most Common Type', value: a.topType ?? '—', accent: 'social' },
          ]}
        />
        <div className="grid lg:grid-cols-2 gap-3">
          <HorizontalBarList title="Category Breakdown" data={a.byCategory} />
          <HorizontalBarList title="Type Breakdown" data={a.byType} />
        </div>
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="People"
        summary="Friend rankings, time together, and hangout style"
        open={accordion.isSocialOpen('people')}
        onToggle={() => accordion.toggleSocial('people')}
        nested
      >
        <StatGrid
          columns={2}
          items={[
            { label: 'Group Hangout %', value: `${p.groupHangoutPct.toFixed(0)}%`, accent: 'social' },
            { label: 'Solo Hangout %', value: `${p.soloHangoutPct.toFixed(0)}%`, accent: 'social' },
          ]}
        />
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
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 10)
            .map((r) => ({
              name: r.name,
              primary: `${r.hours.toFixed(1)}h`,
              secondary: `${r.hangouts} hangouts`,
            }))}
        />
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Locations"
        summary="Most visited places and favorites"
        open={accordion.isSocialOpen('locations')}
        onToggle={() => accordion.toggleSocial('locations')}
        nested
      >
        <StatGrid
          columns={2}
          items={[{ label: 'Total Unique Locations', value: String(l.uniqueCount), accent: 'social' }]}
        />
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
      </StatisticsCollapsibleSection>

      <StatisticsCollapsibleSection
        title="Charts"
        summary="Social hours and activity visualizations"
        open={accordion.isSocialOpen('charts')}
        onToggle={() => accordion.toggleSocial('charts')}
        nested
      >
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
      </StatisticsCollapsibleSection>
    </div>
  );
}
