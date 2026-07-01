import { useApp } from '../../context/AppContext';
import { CustomOptionListCard } from './CustomOptionListCard';
import { countFriendsWithTag, countHangoutsWithType, countIdeasWithType } from '../../lib/social-options';
import { DEFAULT_HANGOUT_TYPE } from '../../types';

export function SocialCustomization() {
  const {
    data,
    addFriendTag,
    updateFriendTag,
    deleteFriendTag,
    addHangoutType,
    updateHangoutType,
    deleteHangoutType,
  } = useApp();

  return (
    <div className="space-y-4">
      <CustomOptionListCard
        title="Friend Tags"
        description="Customize tags used when adding or filtering friends. Friends can have multiple tags."
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
