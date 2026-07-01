import { useApp } from '../../context/AppContext';
import { CustomOptionListCard } from './CustomOptionListCard';
import {
  countFriendsWithTag,
  countFriendsWithGroup,
  countFriendsWithRelationshipStatus,
  countFriendLinksWithType,
} from '../../lib/social-options';
import {
  getFriendTagUsage,
  getFriendGroupUsage,
  getRelationshipStatusUsage,
  getRelationshipTypeUsage,
} from '../../lib/social-customization-usage';
import { DEFAULT_RELATIONSHIP_STATUS, DEFAULT_RELATIONSHIP_TYPE } from '../../types';
import { HangoutCategoryCustomization } from './HangoutCategoryCustomization';

export function SocialCustomization() {
  const {
    data,
    addFriendTag,
    updateFriendTag,
    deleteFriendTag,
    addFriendGroup,
    updateFriendGroup,
    deleteFriendGroup,
    addRelationshipStatus,
    updateRelationshipStatus,
    deleteRelationshipStatus,
    addRelationshipType,
    updateRelationshipType,
    deleteRelationshipType,
  } = useApp();

  const usageData = { friends: data.friends, hangouts: data.hangouts, ideas: data.ideas };

  return (
    <div className="space-y-4">
      <CustomOptionListCard
        title="Friend Tags"
        description="Customize tags for friends. Friends can have multiple tags. Use Relationship Statuses for dating labels."
        options={data.friendTags}
        usageCount={(name) => countFriendsWithTag(data.friends, name)}
        getUsageLog={(tag) => getFriendTagUsage(usageData, tag)}
        deleteMode="tag"
        deleteResolutionCopy={{
          tagRemove: 'Remove from friends',
          tagReplace: 'Replace with another tag',
        }}
        onAdd={addFriendTag}
        onEdit={updateFriendTag}
        onDelete={(name, action, otherName) => {
          if (action === 'remove') deleteFriendTag(name, { action: 'remove' });
          else if (action === 'replace' && otherName) deleteFriendTag(name, { action: 'replace', name: otherName });
          else deleteFriendTag(name, { action: 'remove' });
        }}
      />

      <CustomOptionListCard
        title="Friend Groups"
        description="Organize friends into groups (separate from tags). Friends can belong to multiple groups."
        options={data.friendGroups}
        usageCount={(name) => countFriendsWithGroup(data.friends, name)}
        getUsageLog={(group) => getFriendGroupUsage(usageData, group)}
        deleteMode="tag"
        deleteResolutionCopy={{
          tagRemove: 'Remove from friends',
          tagReplace: 'Replace with another group',
        }}
        onAdd={addFriendGroup}
        onEdit={updateFriendGroup}
        onDelete={(name, action, otherName) => {
          if (action === 'remove') deleteFriendGroup(name, { action: 'remove' });
          else if (action === 'replace' && otherName) deleteFriendGroup(name, { action: 'replace', name: otherName });
          else deleteFriendGroup(name, { action: 'remove' });
        }}
      />

      <CustomOptionListCard
        title="Relationship Statuses"
        description="Customize relationship status options. Each friend has one status."
        options={data.relationshipStatuses}
        usageCount={(name) => countFriendsWithRelationshipStatus(data.friends, name)}
        getUsageLog={(status) => getRelationshipStatusUsage(usageData, status)}
        defaultFallbackLabel={DEFAULT_RELATIONSHIP_STATUS}
        deleteMode="hangout"
        deleteResolutionCopy={{
          defaultOption: 'Move friends to None',
          otherOption: 'Choose another status',
          clearOption: 'Clear status (set to empty)',
        }}
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
        getUsageLog={(type) => getRelationshipTypeUsage(data, type)}
        defaultFallbackLabel={DEFAULT_RELATIONSHIP_TYPE}
        deleteMode="hangout"
        deleteResolutionCopy={{
          defaultOption: 'Move relationships to Other',
          otherOption: 'Choose another type',
          clearOption: 'Clear type (remove from links)',
        }}
        onAdd={addRelationshipType}
        onEdit={updateRelationshipType}
        onDelete={(name, action, otherName) => {
          if (action === 'default') deleteRelationshipType(name, { action: 'default' });
          else if (action === 'other' && otherName) deleteRelationshipType(name, { action: 'other', name: otherName });
          else deleteRelationshipType(name, { action: 'clear' });
        }}
      />

      <HangoutCategoryCustomization />
    </div>
  );
}
