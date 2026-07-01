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
  FriendLink,
} from '../types';
import { loadAppData, saveAppData, clearAllData, importAppData, exportAppData } from '../lib/storage';
import {
  createPreImportBackup,
  importSectionsFromJsonData,
  parseBackupJson,
  type ImportMode,
  type ImportSectionPreset,
} from '../lib/import-sections';
import { applySpreadsheetImport, type SpreadsheetImportMode } from '../lib/spreadsheet-import';
import {
  importIcsCalendarData,
  type FriendResolution,
  type IcsImportOptions,
  type IcsPreviewItem,
} from '../lib/ics-import';
import { generateId, toLocalISO } from '../lib/dates';
import {
  normalizeOptionName,
  validateOptionName,
} from '../lib/social-options';
import { getReciprocalLinkType, removeLinksToFriend, replaceFriendLinkType, updateAllFriendLinkTypes } from '../lib/friend-links';
import { applyBulkAddRelationships, applyBulkRemoveRelationships } from '../lib/bulk-relationships';
import {
  addBackupToHistory,
  clearUndoSnapshot,
  deleteBackupFromHistory,
  loadBackupHistory,
  loadUndoSnapshot,
  saveUndoSnapshot,
  UNDO_CLEANUP_KEY,
  UNDO_IMPORT_KEY,
} from '../lib/backup-history';
import {
  buildCleanupPreview,
  bulkUpdateHangoutCategoryType,
  bulkUpdateHangoutLocations,
  deleteFriendsById,
  deleteHangoutsById,
  mergeFriends,
  normalizeImportedFriendNames,
  renameFriendEverywhere,
} from '../lib/data-cleanup';
import { inferCategoryAndType } from '../lib/hangout-categories';
import { DEFAULT_HANGOUT_TYPE, DEFAULT_RELATIONSHIP_STATUS, DEFAULT_RELATIONSHIP_TYPE } from '../types';

export type DeleteTagResolution =
  | { action: 'remove' }
  | { action: 'replace'; name: string };

export type DeleteTypeResolution =
  | { action: 'default' }
  | { action: 'other'; name: string }
  | { action: 'clear' };

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
  duplicateNapEntry: (id: string) => void;
  // Friends
  addFriend: (friend: Omit<Friend, 'id' | 'createdAt'>) => void;
  updateFriend: (id: string, friend: Partial<Friend>) => void;
  deleteFriend: (id: string) => void;
  addFriendLink: (friendId: string, relatedFriendId: string, type: string, notes?: string) => string | null;
  updateFriendLink: (friendId: string, linkId: string, updates: { relatedFriendId?: string; type?: string; notes?: string }) => string | null;
  deleteFriendLink: (friendId: string, linkId: string) => void;
  bulkAddFriendRelationships: (
    friendIds: string[],
    type: string,
    reciprocal?: boolean
  ) => { createdPairs: number; skippedPairs: number };
  bulkRemoveFriendRelationships: (
    friendIds: string[],
    typeFilter?: string
  ) => { removedPairs: number };
  // Hangouts
  startHangout: (friendIds: string[], category?: string, type?: HangoutType, location?: string) => void;
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
  toggleFavoriteLocation: (location: string) => void;
  archiveIdea: (id: string) => void;
  convertIdeaToHangout: (id: string, friendIds: string[], startTime: string, endTime: string) => void;
  // Social customization
  addFriendTag: (name: string) => string | null;
  updateFriendTag: (oldName: string, newName: string) => string | null;
  deleteFriendTag: (name: string, resolution: DeleteTagResolution) => void;
  addFriendGroup: (name: string) => string | null;
  updateFriendGroup: (oldName: string, newName: string) => string | null;
  deleteFriendGroup: (name: string, resolution: DeleteTagResolution) => void;
  addRelationshipStatus: (name: string) => string | null;
  updateRelationshipStatus: (oldName: string, newName: string) => string | null;
  deleteRelationshipStatus: (name: string, resolution: DeleteTypeResolution) => void;
  addHangoutType: (name: string) => string | null;
  updateHangoutType: (oldName: string, newName: string) => string | null;
  deleteHangoutType: (name: string, resolution: DeleteTypeResolution) => void;
  addHangoutCategory: (name: string) => string | null;
  updateHangoutCategory: (oldName: string, newName: string) => string | null;
  deleteHangoutCategory: (name: string, resolution: DeleteTypeResolution) => void;
  addTypeToCategory: (category: string, type: string) => string | null;
  updateTypeInCategory: (category: string, oldName: string, newName: string) => string | null;
  deleteTypeFromCategory: (category: string, name: string, resolution: DeleteTypeResolution) => void;
  addRelationshipType: (name: string) => string | null;
  updateRelationshipType: (oldName: string, newName: string) => string | null;
  deleteRelationshipType: (name: string, resolution: DeleteTypeResolution) => void;
  // Data
  exportData: () => string;
  saveManualBackupToHistory: () => void;
  importData: (json: string) => { success: boolean; error?: string };
  importSections: (
    json: string,
    preset: ImportSectionPreset,
    mode: ImportMode
  ) => { success: boolean; error?: string };
  importSleepSpreadsheet: (
    sleepEntries: Omit<SleepEntry, 'id' | 'createdAt'>[],
    napEntries: Omit<NapEntry, 'id' | 'createdAt'>[],
    mode: SpreadsheetImportMode
  ) => { success: boolean; error?: string; sleepCount: number; napCount: number };
  importIcsCalendar: (
    items: IcsPreviewItem[],
    friendResolutions: Record<string, FriendResolution>,
    options: IcsImportOptions
  ) => { success: boolean; error?: string; hangoutsImported: number; friendsCreated: number };
  resetData: () => void;
  getBackupHistory: () => ReturnType<typeof loadBackupHistory>;
  restoreBackup: (id: string) => boolean;
  deleteBackup: (id: string) => void;
  undoLastImport: () => boolean;
  undoLastCleanup: () => boolean;
  runCleanupMergeFriends: (primaryId: string, duplicateIds: string[]) => void;
  runCleanupRenameFriend: (friendId: string, newName: string) => void;
  runCleanupDeleteFriends: (friendIds: string[]) => void;
  runCleanupDeleteHangouts: (hangoutIds: string[]) => void;
  runCleanupBulkCategoryType: (hangoutIds: string[], category: string, type: string) => void;
  runCleanupBulkLocations: (hangoutIds: string[], location: string) => void;
  runCleanupNormalizeNames: () => void;
  getCleanupPreview: () => ReturnType<typeof buildCleanupPreview>;
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
    patch((prev) => {
      const next = { ...prev.settings, ...settings };
      if (next.autoCalculateBedtime && next.autoCalculateWakeTime) {
        if (settings.autoCalculateBedtime === true) {
          next.autoCalculateWakeTime = false;
        } else if (settings.autoCalculateWakeTime === true) {
          next.autoCalculateBedtime = false;
        } else {
          next.autoCalculateWakeTime = false;
        }
      }
      return { ...prev, settings: next };
    });
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

  const duplicateNapEntry = useCallback((id: string) => {
    patch((prev) => {
      const original = prev.napEntries.find((n) => n.id === id);
      if (!original) return prev;
      const copy: NapEntry = { ...original, id: generateId(), createdAt: toLocalISO() };
      return { ...prev, napEntries: [...prev.napEntries, copy] };
    });
  }, [patch]);

  const addFriend = useCallback((friend: Omit<Friend, 'id' | 'createdAt'>) => {
    patch((prev) => ({
      ...prev,
      friends: [
        ...prev.friends,
        { ...friend, groups: friend.groups ?? [], relationships: friend.relationships ?? [], id: generateId(), createdAt: toLocalISO() },
      ],
    }));
  }, [patch]);

  const updateFriend = useCallback((id: string, friend: Partial<Friend>) => {
    patch((prev) => ({
      ...prev,
      friends: prev.friends.map((f) => (f.id === id ? { ...f, ...friend } : f)),
    }));
  }, [patch]);

  const deleteFriend = useCallback((id: string) => {
    patch((prev) => {
      const withoutDeleted = prev.friends.filter((f) => f.id !== id);
      const cleaned = removeLinksToFriend(withoutDeleted, id);
      return {
        ...prev,
        friends: cleaned,
        hangouts: prev.hangouts.map((h) => ({
          ...h,
          friendIds: h.friendIds.filter((fid) => fid !== id),
        })),
        ideas: prev.ideas.map((i) => ({
          ...i,
          friendIds: i.friendIds.filter((fid) => fid !== id),
        })),
      };
    });
  }, [patch]);

  const addFriendLink = useCallback(
    (friendId: string, relatedFriendId: string, type: string, notes = ''): string | null => {
      if (friendId === relatedFriendId) return 'A friend cannot be linked to themselves.';
      const related = data.friends.find((f) => f.id === relatedFriendId);
      if (!related) return 'Related friend not found.';
      const owner = data.friends.find((f) => f.id === friendId);
      if (!owner) return 'Friend not found.';
      if (owner.relationships.some((r) => r.relatedFriendId === relatedFriendId)) {
        return 'A relationship with this friend already exists.';
      }

      patch((prev) => {
        const reciprocalType = getReciprocalLinkType(type);
        const newLink: FriendLink = {
          id: generateId(),
          relatedFriendId,
          type,
          notes,
          createdAt: toLocalISO(),
        };
        const reciprocalLink: FriendLink = {
          id: generateId(),
          relatedFriendId: friendId,
          type: reciprocalType,
          notes,
          createdAt: toLocalISO(),
        };

        return {
          ...prev,
          friends: prev.friends.map((f) => {
            if (f.id === friendId) {
              return { ...f, relationships: [...f.relationships, newLink] };
            }
            if (f.id === relatedFriendId) {
              return { ...f, relationships: [...f.relationships, reciprocalLink] };
            }
            return f;
          }),
        };
      });
      return null;
    },
    [patch, data.friends]
  );

  const updateFriendLink = useCallback(
    (
      friendId: string,
      linkId: string,
      updates: { relatedFriendId?: string; type?: string; notes?: string }
    ): string | null => {
      const owner = data.friends.find((f) => f.id === friendId);
      const link = owner?.relationships.find((r) => r.id === linkId);
      if (!owner || !link) return 'Relationship not found.';

      const newRelatedId = updates.relatedFriendId ?? link.relatedFriendId;
      if (newRelatedId === friendId) return 'A friend cannot be linked to themselves.';

      if (
        newRelatedId !== link.relatedFriendId &&
        owner.relationships.some((r) => r.id !== linkId && r.relatedFriendId === newRelatedId)
      ) {
        return 'A relationship with this friend already exists.';
      }

      const newType = updates.type ?? link.type;
      const newNotes = updates.notes ?? link.notes;
      const oldRelatedId = link.relatedFriendId;
      const reciprocalType = getReciprocalLinkType(newType);

      patch((prev) => {
        let friends = prev.friends.map((f) => {
          if (f.id === oldRelatedId && oldRelatedId !== newRelatedId) {
            return {
              ...f,
              relationships: f.relationships.filter((r) => r.relatedFriendId !== friendId),
            };
          }
          return f;
        });

        friends = friends.map((f) => {
          if (f.id === friendId) {
            return {
              ...f,
              relationships: f.relationships.map((r) =>
                r.id === linkId
                  ? { ...r, relatedFriendId: newRelatedId, type: newType, notes: newNotes }
                  : r
              ),
            };
          }
          return f;
        });

        friends = friends.map((f) => {
          if (f.id !== newRelatedId) return f;
          const existing = f.relationships.find((r) => r.relatedFriendId === friendId);
          if (existing) {
            return {
              ...f,
              relationships: f.relationships.map((r) =>
                r.relatedFriendId === friendId
                  ? { ...r, type: reciprocalType, notes: newNotes }
                  : r
              ),
            };
          }
          return {
            ...f,
            relationships: [
              ...f.relationships,
              {
                id: generateId(),
                relatedFriendId: friendId,
                type: reciprocalType,
                notes: newNotes,
                createdAt: toLocalISO(),
              },
            ],
          };
        });

        return { ...prev, friends };
      });
      return null;
    },
    [patch, data.friends]
  );

  const deleteFriendLink = useCallback((friendId: string, linkId: string) => {
    patch((prev) => {
      const owner = prev.friends.find((f) => f.id === friendId);
      const link = owner?.relationships.find((r) => r.id === linkId);
      if (!link) return prev;

      const relatedId = link.relatedFriendId;
      return {
        ...prev,
        friends: prev.friends.map((f) => {
          if (f.id === friendId) {
            return { ...f, relationships: f.relationships.filter((r) => r.id !== linkId) };
          }
          if (f.id === relatedId) {
            return {
              ...f,
              relationships: f.relationships.filter((r) => r.relatedFriendId !== friendId),
            };
          }
          return f;
        }),
      };
    });
  }, [patch]);

  const bulkAddFriendRelationships = useCallback(
    (friendIds: string[], type: string, reciprocal = true) => {
      let result = { createdPairs: 0, skippedPairs: 0 };
      patch((prev) => {
        const applied = applyBulkAddRelationships(
          prev.friends,
          friendIds,
          type,
          reciprocal,
          generateId,
          toLocalISO
        );
        result = { createdPairs: applied.createdPairs, skippedPairs: applied.skippedPairs };
        return { ...prev, friends: applied.friends };
      });
      return result;
    },
    [patch]
  );

  const bulkRemoveFriendRelationships = useCallback(
    (friendIds: string[], typeFilter?: string) => {
      let result = { removedPairs: 0 };
      patch((prev) => {
        const applied = applyBulkRemoveRelationships(prev.friends, friendIds, typeFilter);
        result = { removedPairs: applied.removedPairs };
        return { ...prev, friends: applied.friends };
      });
      return result;
    },
    [patch]
  );

  const startHangout = useCallback(
    (friendIds: string[], category?: string, type?: HangoutType, location = '') => {
      patch((prev) => {
        const catalog = prev.hangoutTypesByCategory ?? {};
        const resolvedType = type ?? prev.activeTimers.hangoutType ?? prev.hangoutTypes[0] ?? DEFAULT_HANGOUT_TYPE;
        const resolvedCategory =
          category ??
          prev.activeTimers.hangoutCategory ??
          inferCategoryAndType(resolvedType, undefined, catalog).category;
        return {
          ...prev,
          activeTimers: {
            ...prev.activeTimers,
            hangoutStart: toLocalISO(),
            hangoutFriendIds: friendIds,
            hangoutCategory: resolvedCategory,
            hangoutType: resolvedType,
            hangoutLocation: location,
          },
        };
      });
    },
    [patch]
  );

  const endHangout = useCallback((notes = '') => {
    patch((prev) => {
      const { hangoutStart, hangoutFriendIds, hangoutCategory, hangoutType, hangoutLocation } = prev.activeTimers;
      if (!hangoutStart) return prev;
      const entry: Hangout = {
        id: generateId(),
        friendIds: hangoutFriendIds,
        startTime: hangoutStart,
        endTime: toLocalISO(),
        location: hangoutLocation,
        category: hangoutCategory,
        type: hangoutType,
        notes,
        segments: [],
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

  const toggleFavoriteLocation = useCallback((location: string) => {
    const trimmed = location.trim();
    if (!trimmed) return;
    patch((prev) => {
      const key = trimmed.toLowerCase();
      const favs = prev.favoriteLocations ?? [];
      const exists = favs.some((f) => f.toLowerCase() === key);
      return {
        ...prev,
        favoriteLocations: exists
          ? favs.filter((f) => f.toLowerCase() !== key)
          : [...favs, trimmed],
      };
    });
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
        const ideaType = idea.type || (prev.hangoutTypes.includes(DEFAULT_HANGOUT_TYPE)
          ? DEFAULT_HANGOUT_TYPE
          : prev.hangoutTypes[0] ?? DEFAULT_HANGOUT_TYPE);
        const resolvedFriends = friendIds.length > 0 ? friendIds : idea.friendIds;
        const notesParts = [idea.title && `Idea: ${idea.title}`, idea.notes].filter(Boolean);
        const hangout: Hangout = {
          id: generateId(),
          friendIds: resolvedFriends,
          startTime,
          endTime,
          location: idea.location,
          category: idea.category,
          type: ideaType,
          notes: notesParts.join('\n\n'),
          segments: [],
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

  const addFriendTag = useCallback((name: string): string | null => {
    const normalized = normalizeOptionName(name);
    const error = validateOptionName(normalized, data.friendTags);
    if (error) return error;
    if (data.relationshipStatuses.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
      return 'Use Relationship Status for this label, not Friend Tags.';
    }
    patch((prev) => ({ ...prev, friendTags: [...prev.friendTags, normalized] }));
    return null;
  }, [patch, data.friendTags, data.relationshipStatuses]);

  const updateFriendTag = useCallback((oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const error = validateOptionName(normalized, data.friendTags, oldName);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      friendTags: prev.friendTags.map((t) => (t === oldName ? normalized : t)),
      friends: prev.friends.map((f) => ({
        ...f,
        tags: [...new Set(f.tags.map((t) => (t === oldName ? normalized : t)))],
      })),
    }));
    return null;
  }, [patch, data.friendTags]);

  const deleteFriendTag = useCallback((name: string, resolution: DeleteTagResolution) => {
    patch((prev) => {
      const friends = prev.friends.map((f) => {
        if (!f.tags.includes(name)) return f;
        if (resolution.action === 'remove') {
          return { ...f, tags: f.tags.filter((t) => t !== name) };
        }
        const replacement = resolution.name;
        return {
          ...f,
          tags: [...new Set(f.tags.map((t) => (t === name ? replacement : t)))],
        };
      });

      return {
        ...prev,
        friendTags: prev.friendTags.filter((t) => t !== name),
        friends,
      };
    });
  }, [patch]);

  const addFriendGroup = useCallback((name: string): string | null => {
    const normalized = normalizeOptionName(name);
    const error = validateOptionName(normalized, data.friendGroups);
    if (error) return error;
    patch((prev) => ({ ...prev, friendGroups: [...prev.friendGroups, normalized] }));
    return null;
  }, [patch, data.friendGroups]);

  const updateFriendGroup = useCallback((oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const error = validateOptionName(normalized, data.friendGroups, oldName);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      friendGroups: prev.friendGroups.map((g) => (g === oldName ? normalized : g)),
      friends: prev.friends.map((f) => ({
        ...f,
        groups: [...new Set((f.groups ?? []).map((g) => (g === oldName ? normalized : g)))],
      })),
    }));
    return null;
  }, [patch, data.friendGroups]);

  const deleteFriendGroup = useCallback((name: string, resolution: DeleteTagResolution) => {
    patch((prev) => {
      const friends = prev.friends.map((f) => {
        if (!(f.groups ?? []).includes(name)) return f;
        if (resolution.action === 'remove') {
          return { ...f, groups: (f.groups ?? []).filter((g) => g !== name) };
        }
        const replacement = resolution.name;
        return {
          ...f,
          groups: [...new Set((f.groups ?? []).map((g) => (g === name ? replacement : g)))],
        };
      });
      return {
        ...prev,
        friendGroups: prev.friendGroups.filter((g) => g !== name),
        friends,
      };
    });
  }, [patch]);

  const addRelationshipStatus = useCallback((name: string): string | null => {
    const normalized = normalizeOptionName(name);
    const error = validateOptionName(normalized, data.relationshipStatuses);
    if (error) return error;
    patch((prev) => ({ ...prev, relationshipStatuses: [...prev.relationshipStatuses, normalized] }));
    return null;
  }, [patch, data.relationshipStatuses]);

  const updateRelationshipStatus = useCallback((oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const error = validateOptionName(normalized, data.relationshipStatuses, oldName);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      relationshipStatuses: prev.relationshipStatuses.map((s) => (s === oldName ? normalized : s)),
      friends: prev.friends.map((f) =>
        f.relationshipStatus === oldName ? { ...f, relationshipStatus: normalized } : f
      ),
    }));
    return null;
  }, [patch, data.relationshipStatuses]);

  const deleteRelationshipStatus = useCallback((name: string, resolution: DeleteTypeResolution) => {
    patch((prev) => {
      let replacement = DEFAULT_RELATIONSHIP_STATUS;
      if (resolution.action === 'default') {
        replacement = prev.relationshipStatuses.includes(DEFAULT_RELATIONSHIP_STATUS)
          ? DEFAULT_RELATIONSHIP_STATUS
          : prev.relationshipStatuses.find((s) => s !== name) ?? DEFAULT_RELATIONSHIP_STATUS;
      } else if (resolution.action === 'other') {
        replacement = resolution.name;
      } else if (resolution.action === 'clear') {
        replacement = '';
      }

      return {
        ...prev,
        relationshipStatuses: prev.relationshipStatuses.filter((s) => s !== name),
        friends: prev.friends.map((f) =>
          f.relationshipStatus === name ? { ...f, relationshipStatus: replacement } : f
        ),
      };
    });
  }, [patch]);

  const addHangoutType = useCallback((name: string): string | null => {
    const normalized = normalizeOptionName(name);
    const error = validateOptionName(normalized, data.hangoutTypes);
    if (error) return error;
    patch((prev) => ({ ...prev, hangoutTypes: [...prev.hangoutTypes, normalized] }));
    return null;
  }, [patch, data.hangoutTypes]);

  const updateHangoutType = useCallback((oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const error = validateOptionName(normalized, data.hangoutTypes, oldName);
    if (error) return error;
    patch((prev) => {
      const nextCatalog = { ...prev.hangoutTypesByCategory };
      for (const [cat, types] of Object.entries(nextCatalog)) {
        nextCatalog[cat] = types.map((t) => (t === oldName ? normalized : t));
      }
      return {
        ...prev,
        hangoutTypes: prev.hangoutTypes.map((t) => (t === oldName ? normalized : t)),
        hangoutTypesByCategory: nextCatalog,
        hangouts: prev.hangouts.map((h) => ({
          ...h,
          type: h.type === oldName ? normalized : h.type,
          segments: h.segments?.map((s) => (s.type === oldName ? { ...s, type: normalized } : s)) ?? [],
        })),
        ideas: prev.ideas.map((i) => (i.type === oldName ? { ...i, type: normalized } : i)),
        activeTimers: prev.activeTimers.hangoutType === oldName
          ? { ...prev.activeTimers, hangoutType: normalized }
          : prev.activeTimers,
      };
    });
    return null;
  }, [patch, data.hangoutTypes]);

  const deleteHangoutType = useCallback((name: string, resolution: DeleteTypeResolution) => {
    patch((prev) => {
      let replacement = '';
      if (resolution.action === 'default') {
        replacement = prev.hangoutTypes.includes(DEFAULT_HANGOUT_TYPE)
          ? DEFAULT_HANGOUT_TYPE
          : prev.hangoutTypes.find((t) => t !== name) ?? '';
      } else if (resolution.action === 'other') {
        replacement = resolution.name;
      }

      return {
        ...prev,
        hangoutTypes: prev.hangoutTypes.filter((t) => t !== name),
        hangouts: prev.hangouts.map((h) => ({
          ...h,
          type: h.type === name ? replacement : h.type,
          segments: h.segments?.map((s) => (s.type === name ? { ...s, type: replacement } : s)) ?? [],
        })),
        ideas: prev.ideas.map((i) =>
          i.type === name ? { ...i, type: replacement } : i
        ),
        activeTimers: prev.activeTimers.hangoutType === name
          ? { ...prev.activeTimers, hangoutType: replacement || (prev.hangoutTypes.find((t) => t !== name) ?? '') }
          : prev.activeTimers,
      };
    });
  }, [patch]);

  const addHangoutCategory = useCallback((name: string): string | null => {
    const normalized = normalizeOptionName(name);
    const error = validateOptionName(normalized, data.hangoutCategories);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      hangoutCategories: [...prev.hangoutCategories, normalized],
      hangoutTypesByCategory: { ...prev.hangoutTypesByCategory, [normalized]: ['Other'] },
    }));
    return null;
  }, [patch, data.hangoutCategories]);

  const addTypeToCategory = useCallback((category: string, type: string): string | null => {
    const normalized = normalizeOptionName(type);
    const types = data.hangoutTypesByCategory[category] ?? [];
    const error = validateOptionName(normalized, types);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      hangoutTypesByCategory: {
        ...prev.hangoutTypesByCategory,
        [category]: [...(prev.hangoutTypesByCategory[category] ?? []), normalized],
      },
      hangoutTypes: prev.hangoutTypes.includes(normalized) ? prev.hangoutTypes : [...prev.hangoutTypes, normalized],
    }));
    return null;
  }, [patch, data.hangoutTypesByCategory]);

  const updateHangoutCategory = useCallback((oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const error = validateOptionName(normalized, data.hangoutCategories, oldName);
    if (error) return error;
    patch((prev) => {
      const nextCatalog = { ...prev.hangoutTypesByCategory };
      if (nextCatalog[oldName]) {
        nextCatalog[normalized] = nextCatalog[oldName];
        delete nextCatalog[oldName];
      }
      return {
        ...prev,
        hangoutCategories: prev.hangoutCategories.map((c) => (c === oldName ? normalized : c)),
        hangoutTypesByCategory: nextCatalog,
        hangouts: prev.hangouts.map((h) => ({
          ...h,
          category: h.category === oldName ? normalized : h.category,
          segments: h.segments?.map((s) => (s.category === oldName ? { ...s, category: normalized } : s)) ?? [],
        })),
        ideas: prev.ideas.map((i) => (i.category === oldName ? { ...i, category: normalized } : i)),
        activeTimers: prev.activeTimers.hangoutCategory === oldName
          ? { ...prev.activeTimers, hangoutCategory: normalized }
          : prev.activeTimers,
      };
    });
    return null;
  }, [patch, data.hangoutCategories]);

  const deleteHangoutCategory = useCallback((name: string, resolution: DeleteTypeResolution) => {
    patch((prev) => {
      let replacement = prev.hangoutCategories.includes('Other') ? 'Other' : prev.hangoutCategories.find((c) => c !== name) ?? 'Other';
      if (resolution.action === 'other') replacement = resolution.name;

      const mergedTypes = [...(prev.hangoutTypesByCategory[replacement] ?? [])];
      for (const t of prev.hangoutTypesByCategory[name] ?? []) {
        if (!mergedTypes.some((x) => x.toLowerCase() === t.toLowerCase())) mergedTypes.push(t);
      }
      const { [name]: _removed, ...restCatalog } = prev.hangoutTypesByCategory;

      return {
        ...prev,
        hangoutCategories: prev.hangoutCategories.filter((c) => c !== name),
        hangoutTypesByCategory: { ...restCatalog, [replacement]: mergedTypes },
        hangouts: prev.hangouts.map((h) => ({
          ...h,
          category: h.category === name ? replacement : h.category,
          segments: h.segments?.map((s) => (s.category === name ? { ...s, category: replacement } : s)) ?? [],
        })),
        ideas: prev.ideas.map((i) => (i.category === name ? { ...i, category: replacement } : i)),
        activeTimers: prev.activeTimers.hangoutCategory === name
          ? { ...prev.activeTimers, hangoutCategory: replacement }
          : prev.activeTimers,
      };
    });
  }, [patch]);

  const updateTypeInCategory = useCallback((category: string, oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const types = data.hangoutTypesByCategory[category] ?? [];
    const error = validateOptionName(normalized, types, oldName);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      hangoutTypes: prev.hangoutTypes.map((t) => (t === oldName ? normalized : t)),
      hangoutTypesByCategory: {
        ...prev.hangoutTypesByCategory,
        [category]: (prev.hangoutTypesByCategory[category] ?? []).map((t) => (t === oldName ? normalized : t)),
      },
      hangouts: prev.hangouts.map((h) => ({
        ...h,
        type: h.category === category && h.type === oldName ? normalized : h.type,
        segments: h.segments?.map((s) =>
          s.category === category && s.type === oldName ? { ...s, type: normalized } : s
        ) ?? [],
      })),
      ideas: prev.ideas.map((i) =>
        i.category === category && i.type === oldName ? { ...i, type: normalized } : i
      ),
      activeTimers:
        prev.activeTimers.hangoutCategory === category && prev.activeTimers.hangoutType === oldName
          ? { ...prev.activeTimers, hangoutType: normalized }
          : prev.activeTimers,
    }));
    return null;
  }, [patch, data.hangoutTypesByCategory]);

  const deleteTypeFromCategory = useCallback((category: string, name: string, resolution: DeleteTypeResolution) => {
    patch((prev) => {
      const types = prev.hangoutTypesByCategory[category] ?? [];
      let replacement = types.includes('Other') ? 'Other' : types.find((t) => t !== name) ?? 'Other';
      if (resolution.action === 'other') replacement = resolution.name;
      else if (resolution.action === 'default') {
        replacement = types.includes(DEFAULT_HANGOUT_TYPE) ? DEFAULT_HANGOUT_TYPE : types.find((t) => t !== name) ?? 'Other';
      }

      const stillUsedElsewhere = Object.entries(prev.hangoutTypesByCategory).some(
        ([cat, list]) => cat !== category && list.includes(name)
      );

      return {
        ...prev,
        hangoutTypesByCategory: {
          ...prev.hangoutTypesByCategory,
          [category]: types.filter((t) => t !== name),
        },
        hangoutTypes: stillUsedElsewhere || !prev.hangoutTypes.includes(name)
          ? prev.hangoutTypes
          : prev.hangoutTypes.filter((t) => t !== name),
        hangouts: prev.hangouts.map((h) => ({
          ...h,
          type: h.category === category && h.type === name ? replacement : h.type,
          segments: h.segments?.map((s) =>
            s.category === category && s.type === name ? { ...s, type: replacement } : s
          ) ?? [],
        })),
        ideas: prev.ideas.map((i) =>
          i.category === category && i.type === name ? { ...i, type: replacement } : i
        ),
        activeTimers:
          prev.activeTimers.hangoutCategory === category && prev.activeTimers.hangoutType === name
            ? { ...prev.activeTimers, hangoutType: replacement }
            : prev.activeTimers,
      };
    });
  }, [patch]);

  const addRelationshipType = useCallback((name: string): string | null => {
    const normalized = normalizeOptionName(name);
    const error = validateOptionName(normalized, data.relationshipTypes);
    if (error) return error;
    patch((prev) => ({ ...prev, relationshipTypes: [...prev.relationshipTypes, normalized] }));
    return null;
  }, [patch, data.relationshipTypes]);

  const updateRelationshipType = useCallback((oldName: string, newName: string): string | null => {
    const normalized = normalizeOptionName(newName);
    const error = validateOptionName(normalized, data.relationshipTypes, oldName);
    if (error) return error;
    patch((prev) => ({
      ...prev,
      relationshipTypes: prev.relationshipTypes.map((t) => (t === oldName ? normalized : t)),
      friends: updateAllFriendLinkTypes(prev.friends, oldName, normalized) as typeof prev.friends,
    }));
    return null;
  }, [patch, data.relationshipTypes]);

  const deleteRelationshipType = useCallback((name: string, resolution: DeleteTypeResolution) => {
    patch((prev) => {
      let replacement = DEFAULT_RELATIONSHIP_TYPE;
      if (resolution.action === 'default') {
        replacement = prev.relationshipTypes.includes(DEFAULT_RELATIONSHIP_TYPE)
          ? DEFAULT_RELATIONSHIP_TYPE
          : prev.relationshipTypes.find((t) => t !== name) ?? DEFAULT_RELATIONSHIP_TYPE;
      } else if (resolution.action === 'other') {
        replacement = resolution.name;
      } else if (resolution.action === 'clear') {
        replacement = '';
      }

      return {
        ...prev,
        relationshipTypes: prev.relationshipTypes.filter((t) => t !== name),
        friends: replaceFriendLinkType(prev.friends, name, replacement) as typeof prev.friends,
      };
    });
  }, [patch]);

  const exportDataFn = useCallback(() => exportAppData(data), [data]);

  const saveManualBackupToHistoryFn = useCallback(() => {
    addBackupToHistory(data, 'manual');
  }, [data]);

  const prepareImportBackup = useCallback((current: AppData) => {
    addBackupToHistory(current, 'import');
    saveUndoSnapshot(UNDO_IMPORT_KEY, current);
    createPreImportBackup();
  }, []);

  const importDataFn = useCallback((json: string) => {
    const parsed = parseBackupJson(json);
    if (!parsed.ok) {
      return { success: false, error: parsed.error };
    }
    addBackupToHistory(data, 'import');
    saveUndoSnapshot(UNDO_IMPORT_KEY, data);
    createPreImportBackup();
    setData(importAppData(json));
    return { success: true };
  }, [data]);

  const getBackupHistoryFn = useCallback(() => loadBackupHistory(), []);

  const restoreBackupFn = useCallback((id: string) => {
    const entry = loadBackupHistory().backups.find((b) => b.id === id);
    if (!entry) return false;
    addBackupToHistory(data, 'manual');
    setData(entry.snapshot);
    return true;
  }, [data]);

  const deleteBackupFn = useCallback((id: string) => {
    deleteBackupFromHistory(id);
  }, []);

  const undoLastImportFn = useCallback(() => {
    const snapshot = loadUndoSnapshot(UNDO_IMPORT_KEY);
    if (!snapshot) return false;
    setData(snapshot);
    clearUndoSnapshot(UNDO_IMPORT_KEY);
    return true;
  }, []);

  const undoLastCleanupFn = useCallback(() => {
    const snapshot = loadUndoSnapshot(UNDO_CLEANUP_KEY);
    if (!snapshot) return false;
    setData(snapshot);
    clearUndoSnapshot(UNDO_CLEANUP_KEY);
    return true;
  }, []);

  const withCleanupBackup = useCallback((fn: (prev: AppData) => AppData) => {
    patch((prev) => {
      addBackupToHistory(prev, 'cleanup');
      saveUndoSnapshot(UNDO_CLEANUP_KEY, prev);
      return fn(prev);
    });
  }, [patch]);

  const getCleanupPreviewFn = useCallback(() => buildCleanupPreview(data), [data]);

  const runCleanupMergeFriendsFn = useCallback(
    (primaryId: string, duplicateIds: string[]) => {
      withCleanupBackup((prev) => mergeFriends(prev, primaryId, duplicateIds));
    },
    [withCleanupBackup]
  );

  const runCleanupRenameFriendFn = useCallback(
    (friendId: string, newName: string) => {
      withCleanupBackup((prev) => renameFriendEverywhere(prev, friendId, newName));
    },
    [withCleanupBackup]
  );

  const runCleanupDeleteFriendsFn = useCallback(
    (friendIds: string[]) => {
      withCleanupBackup((prev) => deleteFriendsById(prev, friendIds));
    },
    [withCleanupBackup]
  );

  const runCleanupDeleteHangoutsFn = useCallback(
    (hangoutIds: string[]) => {
      withCleanupBackup((prev) => deleteHangoutsById(prev, hangoutIds));
    },
    [withCleanupBackup]
  );

  const runCleanupBulkCategoryTypeFn = useCallback(
    (hangoutIds: string[], category: string, type: string) => {
      withCleanupBackup((prev) => bulkUpdateHangoutCategoryType(prev, hangoutIds, category, type));
    },
    [withCleanupBackup]
  );

  const runCleanupBulkLocationsFn = useCallback(
    (hangoutIds: string[], location: string) => {
      withCleanupBackup((prev) => bulkUpdateHangoutLocations(prev, hangoutIds, location));
    },
    [withCleanupBackup]
  );

  const runCleanupNormalizeNamesFn = useCallback(() => {
    withCleanupBackup((prev) => normalizeImportedFriendNames(prev));
  }, [withCleanupBackup]);

  const importSectionsFn = useCallback(
    (json: string, preset: ImportSectionPreset, mode: ImportMode) => {
      prepareImportBackup(data);
      const result = importSectionsFromJsonData(data, json, { preset, mode });
      if (result.success) {
        setData(result.data);
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [data, prepareImportBackup]
  );

  const importSleepSpreadsheetFn = useCallback(
    (
      sleepEntries: Omit<SleepEntry, 'id' | 'createdAt'>[],
      napEntries: Omit<NapEntry, 'id' | 'createdAt'>[],
      mode: SpreadsheetImportMode
    ) => {
      if (sleepEntries.length === 0 && napEntries.length === 0) {
        return { success: false, error: 'No entries to import.', sleepCount: 0, napCount: 0 };
      }

      prepareImportBackup(data);

      const sleepCount = sleepEntries.length;
      const napCount = napEntries.length;

      patch((prev) => {
        const imported = applySpreadsheetImport(
          prev.sleepEntries,
          prev.napEntries,
          sleepEntries,
          napEntries,
          mode
        );
        return {
          ...prev,
          sleepEntries: imported.sleepEntries,
          napEntries: imported.napEntries,
        };
      });

      return { success: true, sleepCount, napCount };
    },
    [patch, data, prepareImportBackup]
  );

  const importIcsCalendarFn = useCallback(
    (
      items: IcsPreviewItem[],
      friendResolutions: Record<string, FriendResolution>,
      options: IcsImportOptions
    ) => {
      prepareImportBackup(data);
      const result = importIcsCalendarData(data, items, friendResolutions, options);
      if (result.success) {
        setData(result.data);
        return {
          success: true,
          hangoutsImported: result.hangoutsImported,
          friendsCreated: result.friendsCreated,
        };
      }
      return {
        success: false,
        error: result.error,
        hangoutsImported: 0,
        friendsCreated: 0,
      };
    },
    [data, prepareImportBackup]
  );

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
    duplicateNapEntry,
    addFriend,
    updateFriend,
    deleteFriend,
    addFriendLink,
    updateFriendLink,
    deleteFriendLink,
    bulkAddFriendRelationships,
    bulkRemoveFriendRelationships,
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
    toggleFavoriteLocation,
    archiveIdea,
    convertIdeaToHangout,
    addFriendTag,
    updateFriendTag,
    deleteFriendTag,
    addFriendGroup,
    updateFriendGroup,
    deleteFriendGroup,
    addRelationshipStatus,
    updateRelationshipStatus,
    deleteRelationshipStatus,
    addHangoutType,
    updateHangoutType,
    deleteHangoutType,
    addHangoutCategory,
    updateHangoutCategory,
    deleteHangoutCategory,
    addTypeToCategory,
    updateTypeInCategory,
    deleteTypeFromCategory,
    addRelationshipType,
    updateRelationshipType,
    deleteRelationshipType,
    exportData: exportDataFn,
    saveManualBackupToHistory: saveManualBackupToHistoryFn,
    importData: importDataFn,
    importSections: importSectionsFn,
    importSleepSpreadsheet: importSleepSpreadsheetFn,
    importIcsCalendar: importIcsCalendarFn,
    resetData,
    getBackupHistory: getBackupHistoryFn,
    restoreBackup: restoreBackupFn,
    deleteBackup: deleteBackupFn,
    undoLastImport: undoLastImportFn,
    undoLastCleanup: undoLastCleanupFn,
    runCleanupMergeFriends: runCleanupMergeFriendsFn,
    runCleanupRenameFriend: runCleanupRenameFriendFn,
    runCleanupDeleteFriends: runCleanupDeleteFriendsFn,
    runCleanupDeleteHangouts: runCleanupDeleteHangoutsFn,
    runCleanupBulkCategoryType: runCleanupBulkCategoryTypeFn,
    runCleanupBulkLocations: runCleanupBulkLocationsFn,
    runCleanupNormalizeNames: runCleanupNormalizeNamesFn,
    getCleanupPreview: getCleanupPreviewFn,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
