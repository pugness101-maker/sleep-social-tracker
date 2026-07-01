import { describe, expect, it } from 'vitest';
import {
  MIXED_HANGOUT_CATEGORY,
  MIXED_HANGOUT_MAIN_TYPE,
  resolveHangoutMainFields,
} from './hangout-categories';

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
