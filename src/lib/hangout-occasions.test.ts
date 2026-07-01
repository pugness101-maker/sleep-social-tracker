import { describe, expect, it } from 'vitest';
import type { Hangout } from '../types';
import {
  DEFAULT_HANGOUT_OCCASION,
  migrateHangoutOccasionFields,
  resolveHangoutOccasion,
} from './hangout-occasions';
import { remapLegacyCategoryType } from './hangout-categories';
import { consolidateFunIntoSocialCatalog } from './hangout-categories';

describe('hangout-occasions', () => {
  it('migrates legacy Date type to occasion Date', () => {
    const h: Hangout = {
      id: '1',
      friendIds: [],
      startTime: '2026-01-01T18:00',
      endTime: '2026-01-01T20:00',
      location: '',
      category: 'Social',
      type: 'Date',
      notes: '',
      segments: [],
      createdAt: '',
    };
    const migrated = migrateHangoutOccasionFields(h);
    expect(migrated.occasion).toBe('Date');
    expect(migrated.category).toBe('Social');
    expect(migrated.type).toBe('Other');
  });

  it('defaults other hangouts to None occasion', () => {
    const h: Hangout = {
      id: '1',
      friendIds: [],
      startTime: '',
      endTime: '',
      location: '',
      category: 'Social',
      type: 'Chill',
      notes: '',
      segments: [],
      createdAt: '',
    };
    expect(resolveHangoutOccasion(h)).toBe(DEFAULT_HANGOUT_OCCASION);
  });
});

describe('hangout category migration', () => {
  it('remaps Entertainment to Social', () => {
    expect(remapLegacyCategoryType('Entertainment', 'Movie')).toEqual({
      category: 'Social',
      type: 'Movie / TV',
    });
  });

  it('consolidates Fun catalog into Social', () => {
    const { categories, catalog } = consolidateFunIntoSocialCatalog(
      ['Social', 'Fun', 'Food'],
      {
        Social: ['Chill'],
        Fun: ['Gaming', 'Movie / TV'],
        Food: ['Dinner'],
      }
    );
    expect(categories).not.toContain('Fun');
    expect(catalog.Social).toEqual(expect.arrayContaining(['Chill', 'Gaming', 'Movie / TV']));
    expect(catalog.Fun).toBeUndefined();
  });
});
