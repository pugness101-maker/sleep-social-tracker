import { useCallback, useState } from 'react';
import {
  DEFAULT_STATISTICS_ACCORDION,
  loadStatisticsAccordion,
  saveStatisticsAccordion,
  type StatisticsAccordionState,
  type StatisticsSleepSub,
  type StatisticsSocialSub,
  type StatisticsTopSection,
} from '../lib/statistics-accordion';

export function useStatisticsAccordion() {
  const [state, setState] = useState<StatisticsAccordionState>(() => loadStatisticsAccordion());

  const persist = useCallback((next: StatisticsAccordionState) => {
    setState(next);
    saveStatisticsAccordion(next);
  }, []);

  const isTopOpen = useCallback((id: StatisticsTopSection) => state.top[id], [state.top]);

  const isSleepOpen = useCallback((id: StatisticsSleepSub) => state.sleep[id], [state.sleep]);

  const isSocialOpen = useCallback((id: StatisticsSocialSub) => state.social[id], [state.social]);

  const toggleTop = useCallback((id: StatisticsTopSection) => {
    setState((prev) => {
      const next = { ...prev, top: { ...prev.top, [id]: !prev.top[id] } };
      saveStatisticsAccordion(next);
      return next;
    });
  }, []);

  const toggleSleep = useCallback((id: StatisticsSleepSub) => {
    setState((prev) => {
      const next = { ...prev, sleep: { ...prev.sleep, [id]: !prev.sleep[id] } };
      saveStatisticsAccordion(next);
      return next;
    });
  }, []);

  const toggleSocial = useCallback((id: StatisticsSocialSub) => {
    setState((prev) => {
      const next = { ...prev, social: { ...prev.social, [id]: !prev.social[id] } };
      saveStatisticsAccordion(next);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const top = Object.fromEntries(
      Object.keys(DEFAULT_STATISTICS_ACCORDION.top).map((k) => [k, true])
    ) as StatisticsAccordionState['top'];
    persist({
      top,
      sleep: { ...DEFAULT_STATISTICS_ACCORDION.sleep, overview: true, schedule: true, debt: true, naps: true, charts: true },
      social: {
        ...DEFAULT_STATISTICS_ACCORDION.social,
        friends: true,
        hangouts: true,
        activities: true,
        people: true,
        locations: true,
        charts: true,
      },
    });
  }, [persist]);

  const collapseAll = useCallback(() => {
    persist(structuredClone(DEFAULT_STATISTICS_ACCORDION));
  }, [persist]);

  return {
    isTopOpen,
    isSleepOpen,
    isSocialOpen,
    toggleTop,
    toggleSleep,
    toggleSocial,
    expandAll,
    collapseAll,
  };
}
