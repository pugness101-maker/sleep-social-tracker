import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultAppData, loadAppData, saveAppData, STORAGE_KEY, normalizeAppData } from './storage';
import {
  loadHangoutTabFilters,
  saveHangoutTabFilters,
  sanitizeHangoutTabFilters,
} from './hangout-filters';
import { generateId } from './dates';

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
  };
}

describe('social customization persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  it('keeps deleted Food category after reload', () => {
    const catalog = { ...defaultAppData.hangoutTypesByCategory };
    delete catalog.Food;
    const payload = {
      ...defaultAppData,
      hangoutCategories: defaultAppData.hangoutCategories.filter((c) => c !== 'Food'),
      hangoutTypesByCategory: catalog,
      hangouts: [
        {
          id: generateId(),
          friendIds: [],
          startTime: '2025-01-01T12:00:00',
          endTime: '2025-01-01T14:00:00',
          category: 'Other',
          type: 'Other',
          location: '',
          notes: '',
          segments: [],
          createdAt: '2025-01-01T12:00:00',
        },
      ],
    };
    saveAppData(payload);
    const loaded = loadAppData();
    expect(loaded.hangoutCategories).not.toContain('Food');
    expect(loaded.hangoutTypesByCategory.Food).toBeUndefined();
  });

  it('keeps renamed Social → Social Life after reload', () => {
    const catalog = { ...defaultAppData.hangoutTypesByCategory };
    catalog['Social Life'] = catalog.Social;
    delete catalog.Social;
    const payload = {
      ...defaultAppData,
      hangoutCategories: defaultAppData.hangoutCategories.map((c) => (c === 'Social' ? 'Social Life' : c)),
      hangoutTypesByCategory: catalog,
      hangouts: [
        {
          id: generateId(),
          friendIds: [],
          startTime: '2025-01-01T12:00:00',
          endTime: '2025-01-01T14:00:00',
          category: 'Social Life',
          type: 'Chill',
          location: '',
          notes: '',
          segments: [],
          createdAt: '2025-01-01T12:00:00',
        },
      ],
    };
    saveAppData(payload);
    const loaded = loadAppData();
    expect(loaded.hangoutCategories).toContain('Social Life');
    expect(loaded.hangoutCategories).not.toContain('Social');
    expect(loaded.hangouts[0].category).toBe('Social Life');
    expect(loaded.hangoutTypesByCategory['Social Life']).toContain('Chill');
  });

  it('keeps deleted Chill type from Social after reload', () => {
    const catalog = { ...defaultAppData.hangoutTypesByCategory };
    catalog.Social = catalog.Social.filter((t) => t !== 'Chill');
    const payload = {
      ...defaultAppData,
      hangoutTypesByCategory: catalog,
      hangouts: [
        {
          id: generateId(),
          friendIds: [],
          startTime: '2025-01-01T12:00:00',
          endTime: '2025-01-01T14:00:00',
          category: 'Social',
          type: 'Other',
          location: '',
          notes: '',
          segments: [],
          createdAt: '2025-01-01T12:00:00',
        },
      ],
    };
    saveAppData(payload);
    const loaded = loadAppData();
    expect(loaded.hangoutTypesByCategory.Social).not.toContain('Chill');
  });

  it('sanitizes hangout filters when category is deleted', () => {
    saveHangoutTabFilters({ search: '', category: 'Food', type: 'Dinner', location: '' });
    const catalog = { ...defaultAppData.hangoutTypesByCategory };
    delete catalog.Food;
    const normalized = normalizeAppData({
      ...defaultAppData,
      hangoutCategories: defaultAppData.hangoutCategories.filter((c) => c !== 'Food'),
      hangoutTypesByCategory: catalog,
      hangouts: [],
    });
    const sanitized = sanitizeHangoutTabFilters(
      loadHangoutTabFilters(),
      normalized.hangoutCategories,
      normalized.hangoutTypesByCategory
    );
    expect(sanitized.category).toBe('');
    expect(sanitized.type).toBe('');
  });

  it('round-trips localStorage save and load', () => {
    const payload = {
      ...defaultAppData,
      friendTags: ['Custom Tag'],
    };
    saveAppData(payload);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    const loaded = loadAppData();
    expect(loaded.friendTags).toContain('Custom Tag');
  });
});

describe('buildHangoutCatalogFromSaved', () => {
  it('uses defaults only when hangoutCategories was never saved', () => {
    const normalized = normalizeAppData({ friends: [], hangouts: [], ideas: [] });
    expect(normalized.hangoutCategories).toContain('Food');
    expect(normalized.hangoutCategories).toContain('Social');
  });
});
