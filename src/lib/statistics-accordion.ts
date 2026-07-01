export type StatisticsTopSection = 'overview' | 'sleep' | 'social' | 'combined' | 'trends';

export type StatisticsSleepSub = 'overview' | 'schedule' | 'debt' | 'naps' | 'charts';
export type StatisticsSocialSub = 'friends' | 'hangouts' | 'activities' | 'people' | 'locations' | 'charts';

export interface StatisticsAccordionState {
  top: Record<StatisticsTopSection, boolean>;
  sleep: Record<StatisticsSleepSub, boolean>;
  social: Record<StatisticsSocialSub, boolean>;
}

export const STATISTICS_ACCORDION_KEY = 'sleep-social-tracker-statistics-accordion';

export const DEFAULT_STATISTICS_ACCORDION: StatisticsAccordionState = {
  top: {
    overview: true,
    sleep: false,
    social: false,
    combined: false,
    trends: false,
  },
  sleep: {
    overview: true,
    schedule: true,
    debt: false,
    naps: true,
    charts: false,
  },
  social: {
    friends: true,
    hangouts: true,
    activities: true,
    people: false,
    locations: false,
    charts: false,
  },
};

function mergeBoolRecord<T extends string>(
  defaults: Record<T, boolean>,
  raw: Partial<Record<T, boolean>> | undefined
): Record<T, boolean> {
  const out = { ...defaults };
  if (!raw) return out;
  for (const key of Object.keys(defaults) as T[]) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key]!;
  }
  return out;
}

export function loadStatisticsAccordion(): StatisticsAccordionState {
  try {
    const raw = localStorage.getItem(STATISTICS_ACCORDION_KEY);
    if (!raw) return structuredClone(DEFAULT_STATISTICS_ACCORDION);
    const parsed = JSON.parse(raw) as Partial<StatisticsAccordionState>;
    return {
      top: mergeBoolRecord(DEFAULT_STATISTICS_ACCORDION.top, parsed.top),
      sleep: mergeBoolRecord(DEFAULT_STATISTICS_ACCORDION.sleep, parsed.sleep),
      social: mergeBoolRecord(DEFAULT_STATISTICS_ACCORDION.social, parsed.social),
    };
  } catch {
    return structuredClone(DEFAULT_STATISTICS_ACCORDION);
  }
}

export function saveStatisticsAccordion(state: StatisticsAccordionState): void {
  localStorage.setItem(STATISTICS_ACCORDION_KEY, JSON.stringify(state));
}
