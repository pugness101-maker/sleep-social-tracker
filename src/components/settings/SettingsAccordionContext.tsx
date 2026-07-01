import { createContext, useContext, type ReactNode } from 'react';
import { useSettingsAccordion } from '../../hooks/useSettingsAccordion';

type SettingsAccordionContextValue = ReturnType<typeof useSettingsAccordion>;

const SettingsAccordionContext = createContext<SettingsAccordionContextValue | null>(null);

export function SettingsAccordionProvider({ children }: { children: ReactNode }) {
  const value = useSettingsAccordion();
  return <SettingsAccordionContext.Provider value={value}>{children}</SettingsAccordionContext.Provider>;
}

export function useSettingsAccordionContext(): SettingsAccordionContextValue {
  const ctx = useContext(SettingsAccordionContext);
  if (!ctx) {
    throw new Error('useSettingsAccordionContext must be used within SettingsAccordionProvider');
  }
  return ctx;
}
