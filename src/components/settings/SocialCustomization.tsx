import { useApp } from '../../context/AppContext';
import { CustomOptionListCard } from './CustomOptionListCard';
import {
  countFriendsWithTag,
  countFriendsWithRelationshipStatus,
  countFriendLinksWithType,
  countHangoutsWithType,
  countIdeasWithType,
} from '../../lib/social-options';
import { DEFAULT_HANGOUT_TYPE, DEFAULT_RELATIONSHIP_STATUS, DEFAULT_RELATIONSHIP_TYPE } from '../../types';

export function SocialCustomization() {
  const {
    data,
    addFriendTag,
    updateFriendTag,
    deleteFriendTag,
    addRelationshipStatus,
    updateRelationshipStatus,
    deleteRelationshipStatus,
    addHangoutType,
    updateHangoutType,
    deleteHangoutType,
    addRelationshipType,
    updateRelationshipType,
    deleteRelationshipType,
  } = useApp();

  return (
    <div className="space-y-4">
      <CustomOptionListCard
        title="Friend Tags"
        description="Customize tags for friends. Friends can have multiple tags. Use Relationship Statuses for dating labels."
        options={data.friendTags}
        usageCount={(name) => countFriendsWithTag(data.friends, name)}
        deleteMode="tag"
        onAdd={addFriendTag}
        onEdit={updateFriendTag}
        onDelete={(name, action, otherName) => {
          if (action === 'remove') deleteFriendTag(name, { action: 'remove' });
          else if (action === 'replace' && otherName) deleteFriendTag(name, { action: 'replace', name: otherName });
          else deleteFriendTag(name, { action: 'remove' });
        }}
      />

      <CustomOptionListCard
        title="Relationship Statuses"
        description="Customize relationship status options. Each friend has one status."
        options={data.relationshipStatuses}
        usageCount={(name) => countFriendsWithRelationshipStatus(data.friends, name)}
        defaultFallbackLabel={DEFAULT_RELATIONSHIP_STATUS}
        deleteMode="hangout"
        onAdd={addRelationshipStatus}
        onEdit={updateRelationshipStatus}
        onDelete={(name, action, otherName) => {
          if (action === 'default') deleteRelationshipStatus(name, { action: 'default' });
          else if (action === 'other' && otherName) deleteRelationshipStatus(name, { action: 'other', name: otherName });
          else deleteRelationshipStatus(name, { action: 'clear' });
        }}
      />

      <CustomOptionListCard
        title="Relationship Types"
        description="Customize types for linked relationships between friends (Add/Edit Relationship on a friend's profile)."
        options={data.relationshipTypes}
        usageCount={(name) => countFriendLinksWithType(data.friends, name)}
        defaultFallbackLabel={DEFAULT_RELATIONSHIP_TYPE}
        deleteMode="hangout"
        onAdd={addRelationshipType}
        onEdit={updateRelationshipType}
        onDelete={(name, action, otherName) => {
          if (action === 'default') deleteRelationshipType(name, { action: 'default' });
          else if (action === 'other' && otherName) deleteRelationshipType(name, { action: 'other', name: otherName });
          else deleteRelationshipType(name, { action: 'clear' });
        }}
      />

      <CustomOptionListCard
        title="Hangout Types"
        description="Customize types used when logging hangouts, ideas, and applying filters."
        options={data.hangoutTypes}
        usageCount={(name) =>
          countHangoutsWithType(data.hangouts, name) + countIdeasWithType(data.ideas, name)
        }
        defaultFallbackLabel={DEFAULT_HANGOUT_TYPE}
        deleteMode="hangout"
        onAdd={addHangoutType}
        onEdit={updateHangoutType}
        onDelete={(name, action, otherName) => {
          if (action === 'default') deleteHangoutType(name, { action: 'default' });
          else if (action === 'other' && otherName) deleteHangoutType(name, { action: 'other', name: otherName });
          else deleteHangoutType(name, { action: 'clear' });
        }}
      />
    </div>
  );
}
