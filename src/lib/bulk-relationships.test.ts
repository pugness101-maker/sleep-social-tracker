import { describe, expect, it } from 'vitest';
import type { Friend } from '../types';
import {
  applyBulkAddRelationships,
  applyBulkRemoveRelationships,
  formatBulkPreviewMessage,
  getFriendPairs,
  previewBulkAddRelationships,
  previewBulkRemoveRelationships,
} from './bulk-relationships';

function friend(id: string, name: string, relationships: Friend['relationships'] = []): Friend {
  return {
    id,
    name,
    tags: [],
    groups: [],
    relationshipStatus: 'None',
    birthday: '',
    contactInfo: '',
    notes: '',
    favoriteActivities: [],
    relationships,
    isArchived: false,
    createdAt: '2026-01-01',
  };
}

describe('getFriendPairs', () => {
  it('returns all unique pairs', () => {
    expect(getFriendPairs(['a', 'b', 'c'])).toEqual([
      { aId: 'a', bId: 'b' },
      { aId: 'a', bId: 'c' },
      { aId: 'b', bId: 'c' },
    ]);
  });
});

describe('bulk add relationships', () => {
  const friends = [friend('a', 'JuJu'), friend('b', 'Justin'), friend('c', 'Sophie')];

  it('previews three pairs for three friends', () => {
    const preview = previewBulkAddRelationships(friends, ['a', 'b', 'c'], 'Friend');
    expect(preview.pairCount).toBe(3);
    expect(preview.directionalLinks).toBe(6);
    expect(preview.affectedPairs).toHaveLength(3);
  });

  it('skips existing links', () => {
    const withLink = [
      friend('a', 'JuJu', [{ id: 'l1', relatedFriendId: 'b', type: 'Friend', notes: '', createdAt: '' }]),
      friend('b', 'Justin'),
      friend('c', 'Sophie'),
    ];
    const preview = previewBulkAddRelationships(withLink, ['a', 'b', 'c'], 'Friend');
    expect(preview.affectedPairs).toHaveLength(2);
    expect(preview.skippedPairs).toHaveLength(1);
  });

  it('creates reciprocal links', () => {
    const result = applyBulkAddRelationships(
      friends,
      ['a', 'b', 'c'],
      'Friend',
      true,
      () => 'id-' + Math.random(),
      () => '2026-01-01'
    );
    expect(result.createdPairs).toBe(3);
    const a = result.friends.find((f) => f.id === 'a')!;
    expect(a.relationships).toHaveLength(2);
    const b = result.friends.find((f) => f.id === 'b')!;
    expect(b.relationships.filter((r) => r.relatedFriendId === 'a')).toHaveLength(1);
  });

  it('formats preview message', () => {
    const preview = previewBulkAddRelationships(friends, ['a', 'b', 'c'], 'Friend');
    expect(formatBulkPreviewMessage('add', preview, true)).toContain('3 relationship pairs');
    expect(formatBulkPreviewMessage('add', preview, true)).toContain('6 directional links');
  });
});

describe('bulk remove relationships', () => {
  it('removes links between selected friends only', () => {
    const linked = applyBulkAddRelationships(
      [friend('a', 'JuJu'), friend('b', 'Justin'), friend('c', 'Sophie'), friend('d', 'Other')],
      ['a', 'b', 'c'],
      'Friend',
      true,
      () => crypto.randomUUID(),
      () => '2026-01-01'
    ).friends;

    const result = applyBulkRemoveRelationships(linked, ['a', 'b', 'c'], 'Friend');
    expect(result.removedPairs).toBe(3);
    expect(result.friends.find((f) => f.id === 'a')!.relationships).toHaveLength(0);
  });

  it('previews removals', () => {
    const linked = applyBulkAddRelationships(
      [friend('a', 'A'), friend('b', 'B')],
      ['a', 'b'],
      'Friend',
      true,
      () => '1',
      () => '2026-01-01'
    ).friends;
    const preview = previewBulkRemoveRelationships(linked, ['a', 'b'], 'Friend');
    expect(preview.affectedPairs).toHaveLength(1);
    expect(formatBulkPreviewMessage('remove', preview, true)).toContain('1 relationship pair');
  });
});
