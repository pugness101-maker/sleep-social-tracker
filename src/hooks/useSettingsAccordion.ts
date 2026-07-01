import { useCallback, useState } from 'react';
import {
  DEFAULT_SETTINGS_ACCORDION,
  loadSettingsAccordion,
  saveSettingsAccordion,
  type DataManagementNestedSectionId,
  type NestedSettingsGroup,
  type SettingsAccordionState,
  type SocialNestedSectionId,
  type TopSettingsSectionId,
} from '../lib/settings-accordion';

export function useSettingsAccordion() {
  const [state, setState] = useState<SettingsAccordionState>(() => loadSettingsAccordion());

  const persist = useCallback((next: SettingsAccordionState) => {
    setState(next);
    saveSettingsAccordion(next);
  }, []);

  const isTopOpen = useCallback((id: TopSettingsSectionId) => state.top[id], [state.top]);

  const isNestedOpen = useCallback(
    (group: NestedSettingsGroup, id: SocialNestedSectionId | DataManagementNestedSectionId) =>
      state.nested[group][id as keyof (typeof state.nested)[typeof group]],
    [state.nested]
  );

  const toggleTop = useCallback(
    (id: TopSettingsSectionId) => {
      persist({ ...state, top: { ...state.top, [id]: !state.top[id] } });
    },
    [persist, state]
  );

  const toggleNested = useCallback(
    (group: NestedSettingsGroup, id: SocialNestedSectionId | DataManagementNestedSectionId) => {
      const groupState = state.nested[group];
      persist({
        ...state,
        nested: {
          ...state.nested,
          [group]: { ...groupState, [id]: !groupState[id as keyof typeof groupState] },
        },
      });
    },
    [persist, state]
  );

  const expandAll = useCallback(() => {
    const top = Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS_ACCORDION.top).map((k) => [k, true])
    ) as SettingsAccordionState['top'];
    const social = Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS_ACCORDION.nested.social).map((k) => [k, true])
    ) as SettingsAccordionState['nested']['social'];
    const data_management = Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS_ACCORDION.nested.data_management).map((k) => [k, true])
    ) as SettingsAccordionState['nested']['data_management'];
    persist({ top, nested: { social, data_management } });
  }, [persist]);

  const collapseAll = useCallback(() => {
    persist(structuredClone(DEFAULT_SETTINGS_ACCORDION));
  }, [persist]);

  return {
    isTopOpen,
    isNestedOpen,
    toggleTop,
    toggleNested,
    expandAll,
    collapseAll,
  };
}
