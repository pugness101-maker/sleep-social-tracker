import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  AppData,
  SleepEntry,
  NapEntry,
  Friend,
  Hangout,
  HangoutIdea,
  AppSettings,
  HangoutType,
} from '../types';
import { loadAppData, saveAppData, clearAllData, importAppData, exportAppData } from '../lib/storage';
import { generateId, toLocalISO } from '../lib/dates';

interface AppContextValue {
  data: AppData;
  updateSettings: (settings: Partial<AppSettings>) => void;
  // Sleep
  startSleep: () => void;
  wakeUp: (notes?: string) => void;
  addSleepEntry: (entry: Omit<SleepEntry, 'id' | 'createdAt'>) => void;
  updateSleepEntry: (id: string, entry: Partial<SleepEntry>) => void;
  deleteSleepEntry: (id: string) => void;
  duplicateSleepEntry: (id: string) => void;
  // Naps
  startNap: () => void;
  endNap: (notes?: string) => void;
  addNapEntry: (entry: Omit<NapEntry, 'id' | 'createdAt'>) => void;
  updateNapEntry: (id: string, entry: Partial<NapEntry>) => void;
  deleteNapEntry: (id: string) => void;
  // Friends
  addFriend: (friend: Omit<Friend, 'id' | 'createdAt'>) => void;
  updateFriend: (id: string, friend: Partial<Friend>) => void;
  deleteFriend: (id: string) => void;
  // Hangouts
  startHangout: (friendIds: string[], type?: HangoutType, location?: string) => void;
  endHangout: (notes?: string) => void;
  addHangout: (hangout: Omit<Hangout, 'id' | 'createdAt'>) => void;
  updateHangout: (id: string, hangout: Partial<Hangout>) => void;
  deleteHangout: (id: string) => void;
  duplicateHangout: (id: string) => void;
  // Ideas
  addIdea: (idea: Omit<HangoutIdea, 'id' | 'createdAt' | 'isFavorite'>) => void;
  updateIdea: (id: string, idea: Partial<HangoutIdea>) => void;
  deleteIdea: (id: string) => void;
  toggleFavoriteIdea: (id: string) => void;
  archiveIdea: (id: string) => void;
  convertIdeaToHangout: (id: string, friendIds: string[], startTime: string, endTime: string) => void;
  // Data
  exportData: () => string;
  importData: (json: string) => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData());

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    const theme = data.settings.theme;
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [data.settings.theme]);

  const patch = useCallback((fn: (prev: AppData) => AppData) => {
    setData(fn);
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    patch((prev) => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  }, [patch]);

  const startSleep = useCallback(() => {
    patch((prev) => ({
      ...prev,
      activeTimers: { ...prev.activeTimers, sleepStart: toLocalISO() },
    }));
  }, [patch]);

  const wakeUp = useCallback((notes = '') => {
    patch((prev) => {
      const sleepStart = prev.activeTimers.sleepStart;
      if (!sleepStart) return prev;
      const entry: SleepEntry = {
        id: generateId(),
        sleepStart,
        wakeUp: toLocalISO(),
        notes,
        createdAt: toLocalISO(),
      };
      return {
        ...prev,
        sleepEntries: [...prev.sleepEntries, entry],
        activeTimers: { ...prev.activeTimers, sleepStart: null },
      };
    });
  }, [patch]);

  const addSleepEntry = useCallback((entry: Omit<SleepEntry, 'id' | 'createdAt'>) => {
    patch((prev) => ({
      ...prev,
      sleepEntries: [...prev.sleepEntries, { ...entry, id: generateId(), createdAt: toLocalISO() }],
    }));
  }, [patch]);

  const updateSleepEntry = useCallback((id: string, entry: Partial<SleepEntry>) => {
    patch((prev) => ({
      ...prev,
      sleepEntries: prev.sleepEntries.map((s) => (s.id === id ? { ...s, ...entry } : s)),
    }));
  }, [patch]);

  const deleteSleepEntry = useCallback((id: string) => {
    patch((prev) => ({ ...prev, sleepEntries: prev.sleepEntries.filter((s) => s.id !== id) }));
  }, [patch]);

  const duplicateSleepEntry = useCallback((id: string) => {
    patch((prev) => {
      const original = prev.sleepEntries.find((s) => s.id === id);
      if (!original) return prev;
      const copy: SleepEntry = { ...original, id: generateId(), createdAt: toLocalISO() };
      return { ...prev, sleepEntries: [...prev.sleepEntries, copy] };
    });
  }, [patch]);

  const startNap = useCallback(() => {
    patch((prev) => ({
      ...prev,
      activeTimers: { ...prev.activeTimers, napStart: toLocalISO() },
    }));
  }, [patch]);

  const endNap = useCallback((notes = '') => {
    patch((prev) => {
      const napStart = prev.activeTimers.napStart;
      if (!napStart) return prev;
      const entry: NapEntry = {
        id: generateId(),
        napStart,
        napEnd: toLocalISO(),
        notes,
        createdAt: toLocalISO(),
      };
      return {
        ...prev,
        napEntries: [...prev.napEntries, entry],
        activeTimers: { ...prev.activeTimers, napStart: null },
      };
    });
  }, [patch]);

  const addNapEntry = useCallback((entry: Omit<NapEntry, 'id' | 'createdAt'>) => {
    patch((prev) => ({
      ...prev,
      napEntries: [...prev.napEntries, { ...entry, id: generateId(), createdAt: toLocalISO() }],
    }));
  }, [patch]);

  const updateNapEntry = useCallback((id: string, entry: Partial<NapEntry>) => {
    patch((prev) => ({
      ...prev,
      napEntries: prev.napEntries.map((n) => (n.id === id ? { ...n, ...entry } : n)),
    }));
  }, [patch]);

  const deleteNapEntry = useCallback((id: string) => {
    patch((prev) => ({ ...prev, napEntries: prev.napEntries.filter((n) => n.id !== id) }));
  }, [patch]);

  const addFriend = useCallback((friend: Omit<Friend, 'id' | 'createdAt'>) => {
    patch((prev) => ({
      ...prev,
      friends: [...prev.friends, { ...friend, id: generateId(), createdAt: toLocalISO() }],
    }));
  }, [patch]);

  const updateFriend = useCallback((id: string, friend: Partial<Friend>) => {
    patch((prev) => ({
      ...prev,
      friends: prev.friends.map((f) => (f.id === id ? { ...f, ...friend } : f)),
    }));
  }, [patch]);

  const deleteFriend = useCallback((id: string) => {
    patch((prev) => ({
      ...prev,
      friends: prev.friends.filter((f) => f.id !== id),
      hangouts: prev.hangouts.map((h) => ({
        ...h,
        friendIds: h.friendIds.filter((fid) => fid !== id),
      })),
      ideas: prev.ideas.map((i) => ({
        ...i,
        friendIds: i.friendIds.filter((fid) => fid !== id),
      })),
    }));
  }, [patch]);

  const startHangout = useCallback(
    (friendIds: string[], type: HangoutType = 'Chill', location = '') => {
      patch((prev) => ({
        ...prev,
        activeTimers: {
          ...prev.activeTimers,
          hangoutStart: toLocalISO(),
          hangoutFriendIds: friendIds,
          hangoutType: type,
          hangoutLocation: location,
        },
      }));
    },
    [patch]
  );

  const endHangout = useCallback((notes = '') => {
    patch((prev) => {
      const { hangoutStart, hangoutFriendIds, hangoutType, hangoutLocation } = prev.activeTimers;
      if (!hangoutStart) return prev;
      const entry: Hangout = {
        id: generateId(),
        friendIds: hangoutFriendIds,
        startTime: hangoutStart,
        endTime: toLocalISO(),
        location: hangoutLocation,
        type: hangoutType,
        notes,
        createdAt: toLocalISO(),
      };
      return {
        ...prev,
        hangouts: [...prev.hangouts, entry],
        activeTimers: {
          ...prev.activeTimers,
          hangoutStart: null,
          hangoutFriendIds: [],
          hangoutLocation: '',
        },
      };
    });
  }, [patch]);

  const addHangout = useCallback((hangout: Omit<Hangout, 'id' | 'createdAt'>) => {
    patch((prev) => ({
      ...prev,
      hangouts: [...prev.hangouts, { ...hangout, id: generateId(), createdAt: toLocalISO() }],
    }));
  }, [patch]);

  const updateHangout = useCallback((id: string, hangout: Partial<Hangout>) => {
    patch((prev) => ({
      ...prev,
      hangouts: prev.hangouts.map((h) => (h.id === id ? { ...h, ...hangout } : h)),
    }));
  }, [patch]);

  const deleteHangout = useCallback((id: string) => {
    patch((prev) => ({ ...prev, hangouts: prev.hangouts.filter((h) => h.id !== id) }));
  }, [patch]);

  const duplicateHangout = useCallback((id: string) => {
    patch((prev) => {
      const original = prev.hangouts.find((h) => h.id === id);
      if (!original) return prev;
      const copy: Hangout = { ...original, id: generateId(), createdAt: toLocalISO() };
      return { ...prev, hangouts: [...prev.hangouts, copy] };
    });
  }, [patch]);

  const addIdea = useCallback((idea: Omit<HangoutIdea, 'id' | 'createdAt' | 'isFavorite'>) => {
    patch((prev) => ({
      ...prev,
      ideas: [...prev.ideas, { ...idea, id: generateId(), isFavorite: false, createdAt: toLocalISO() }],
    }));
  }, [patch]);

  const updateIdea = useCallback((id: string, idea: Partial<HangoutIdea>) => {
    patch((prev) => ({
      ...prev,
      ideas: prev.ideas.map((i) => (i.id === id ? { ...i, ...idea } : i)),
    }));
  }, [patch]);

  const deleteIdea = useCallback((id: string) => {
    patch((prev) => ({ ...prev, ideas: prev.ideas.filter((i) => i.id !== id) }));
  }, [patch]);

  const toggleFavoriteIdea = useCallback((id: string) => {
    patch((prev) => ({
      ...prev,
      ideas: prev.ideas.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i)),
    }));
  }, [patch]);

  const archiveIdea = useCallback((id: string) => {
    patch((prev) => ({
      ...prev,
      ideas: prev.ideas.map((i) =>
        i.id === id ? { ...i, status: 'Archived' as const } : i
      ),
    }));
  }, [patch]);

  const convertIdeaToHangout = useCallback(
    (id: string, friendIds: string[], startTime: string, endTime: string) => {
      patch((prev) => {
        const idea = prev.ideas.find((i) => i.id === id);
        if (!idea) return prev;
        const hangout: Hangout = {
          id: generateId(),
          friendIds,
          startTime,
          endTime,
          location: idea.location,
          type: 'Other',
          notes: idea.notes,
          createdAt: toLocalISO(),
        };
        return {
          ...prev,
          hangouts: [...prev.hangouts, hangout],
          ideas: prev.ideas.map((i) =>
            i.id === id ? { ...i, status: 'Completed' as const } : i
          ),
        };
      });
    },
    [patch]
  );

  const exportDataFn = useCallback(() => exportAppData(data), [data]);

  const importDataFn = useCallback((json: string) => {
    setData(importAppData(json));
  }, []);

  const resetData = useCallback(() => {
    setData(clearAllData());
  }, []);

  const value: AppContextValue = {
    data,
    updateSettings,
    startSleep,
    wakeUp,
    addSleepEntry,
    updateSleepEntry,
    deleteSleepEntry,
    duplicateSleepEntry,
    startNap,
    endNap,
    addNapEntry,
    updateNapEntry,
    deleteNapEntry,
    addFriend,
    updateFriend,
    deleteFriend,
    startHangout,
    endHangout,
    addHangout,
    updateHangout,
    deleteHangout,
    duplicateHangout,
    addIdea,
    updateIdea,
    deleteIdea,
    toggleFavoriteIdea,
    archiveIdea,
    convertIdeaToHangout,
    exportData: exportDataFn,
    importData: importDataFn,
    resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
