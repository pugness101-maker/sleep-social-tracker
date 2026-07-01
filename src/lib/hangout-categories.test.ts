import { describe, expect, it } from 'vitest';
import {
  MIXED_HANGOUT_CATEGORY,
  MIXED_HANGOUT_MAIN_TYPE,
  applyRetiredTypeResolution,
  consolidateFaithIntoOtherCatalog,
  consolidateFunIntoSocialCatalog,
  findRetiredTypeUsage,
  migrateFaithCategoryOnHangouts,
  migrateFunCategoryOnHangouts,
  pruneRetiredTypesFromCatalog,
  resolveHangoutMainFields,
} from './hangout-categories';
import { defaultAppData } from './storage';

const catalog = {
  Social: ['Chill', 'Party', 'Other'],
  Food: ['Dinner', 'Other'],
  Mixed: [],
};
const categories = ['Social', 'Food', 'Mixed'];

describe('resolveHangoutMainFields', () => {
  it('forces Mixed type when category is Mixed', () => {
    expect(resolveHangoutMainFields('Mixed', 'Chill', catalog, categories)).toEqual({
      category: MIXED_HANGOUT_CATEGORY,
      type: MIXED_HANGOUT_MAIN_TYPE,
    });
  });

  it('clears Mixed type when switching to Social', () => {
    expect(resolveHangoutMainFields('Social', 'Mixed', catalog, categories)).toEqual({
      category: 'Social',
      type: 'Chill',
    });
  });

  it('keeps valid type when switching categories', () => {
    expect(resolveHangoutMainFields('Food', 'Dinner', catalog, categories)).toEqual({
      category: 'Food',
      type: 'Dinner',
    });
  });

  it('defaults type when switching to category without prior type', () => {
    expect(resolveHangoutMainFields('Food', 'Chill', catalog, categories)).toEqual({
      category: 'Food',
      type: 'Other',
    });
  });
});

describe('Fun into Social migration', () => {
  it('remaps Fun hangout category to Social', () => {
    const migrated = migrateFunCategoryOnHangouts([
      {
        id: '1',
        friendIds: [],
        startTime: '',
        endTime: '',
        location: '',
        occasion: 'None',
        category: 'Fun',
        type: 'Gaming',
        notes: '',
        segments: [{ id: 's1', category: 'Fun', type: 'Movie / TV', friendIds: [], startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' }],
        createdAt: '',
      },
    ]);
    expect(migrated[0].category).toBe('Social');
    expect(migrated[0].segments[0].category).toBe('Social');
  });

  it('merges Fun types into Social catalog', () => {
    const { categories, catalog } = consolidateFunIntoSocialCatalog(
      ['Social', 'Fun'],
      { Social: ['Chill'], Fun: ['Gaming'] }
    );
    expect(categories).toEqual(['Social']);
    expect(catalog.Social).toContain('Gaming');
    expect(catalog.Fun).toBeUndefined();
  });

  it('merges Fun into renamed Social category', () => {
    const catalog = {
      'Social Life': ['Chill', 'Party'],
      Fun: ['Gaming'],
    };
    const migrated = migrateFunCategoryOnHangouts(
      [
        {
          id: '1',
          friendIds: [],
          startTime: '',
          endTime: '',
          location: '',
          occasion: 'None',
          category: 'Fun',
          type: 'Gaming',
          notes: '',
          segments: [],
          createdAt: '',
        },
      ],
      ['Social Life', 'Food'],
      catalog
    );
    expect(migrated[0].category).toBe('Social Life');

    const { categories, catalog: nextCatalog } = consolidateFunIntoSocialCatalog(
      ['Social Life', 'Fun', 'Food'],
      catalog
    );
    expect(categories).not.toContain('Fun');
    expect(categories).not.toContain('Social');
    expect(categories).toContain('Social Life');
    expect(nextCatalog['Social Life']).toContain('Gaming');
  });
});

describe('Faith into Other migration', () => {
  it('remaps Faith hangout category to Other', () => {
    const migrated = migrateFaithCategoryOnHangouts([
      {
        id: '1',
        friendIds: [],
        startTime: '',
        endTime: '',
        location: '',
        occasion: 'None',
        category: 'Faith',
        type: 'Church',
        notes: '',
        segments: [{ id: 's1', category: 'Faith', type: 'Bible Study', friendIds: [], startTime: '', endTime: '', durationMinutes: null, location: '', notes: '' }],
        createdAt: '',
      },
    ]);
    expect(migrated[0].category).toBe('Other');
    expect(migrated[0].segments[0].category).toBe('Other');
  });

  it('merges Faith types into Other catalog', () => {
    const { categories, catalog } = consolidateFaithIntoOtherCatalog(
      ['Social', 'Faith', 'Other'],
      { Other: ['School'], Faith: ['Church', 'Small Group'] }
    );
    expect(categories).not.toContain('Faith');
    expect(catalog.Other).toContain('Church');
    expect(catalog.Other).toContain('Small Group');
    expect(catalog.Faith).toBeUndefined();
  });
});

describe('retired default types', () => {
  it('prunes removed types from catalog', () => {
    const { catalog } = pruneRetiredTypesFromCatalog(['Social', 'Other'], {
      Social: ['Chill', 'Concert'],
      Other: ['Study', 'School'],
    });
    expect(catalog.Social).not.toContain('Concert');
    expect(catalog.Other).not.toContain('Study');
    expect(catalog.Other).toContain('School');
  });

  it('finds retired type usage and resolves it', () => {
    const data = {
      ...defaultAppData,
      hangouts: [
        {
          id: '1',
          friendIds: [],
          startTime: '2025-01-01T12:00:00',
          endTime: '2025-01-01T14:00:00',
          category: 'Social',
          type: 'Concert',
          location: '',
          notes: '',
          segments: [],
          createdAt: '2025-01-01T12:00:00',
        },
      ],
    };
    const pending = findRetiredTypeUsage(data);
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe('Concert');

    const resolved = applyRetiredTypeResolution(data, 'Social', 'Concert', {
      action: 'replace',
      category: 'Social',
      type: 'Activity',
    });
    expect(resolved.hangouts[0].type).toBe('Activity');
    expect(findRetiredTypeUsage(resolved)).toHaveLength(0);
  });
});
