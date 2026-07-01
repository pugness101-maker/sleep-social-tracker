import { useApp } from '../../context/AppContext';
import { CustomOptionListCard } from './CustomOptionListCard';
import { countFriendsWithCategory, countHangoutsWithType } from '../../lib/social-options';
import { DEFAULT_FRIEND_CATEGORY, DEFAULT_HANGOUT_TYPE } from '../../types';

export function SocialCustomization() {
  const {
    data,
    addFriendCategory,
    updateFriendCategory,
    deleteFriendCategory,
    addHangoutType,
    updateHangoutType,
    deleteHangoutType,
  } = useApp();

  return (
    <div className="space-y-4">
      <CustomOptionListCard
        title="Friend Categories"
        description="Customize categories used when adding or filtering friends."
        options={data.friendCategories}
        usageCount={(name) => countFriendsWithCategory(data.friends, name)}
        defaultFallbackLabel={DEFAULT_FRIEND_CATEGORY}
        onAdd={addFriendCategory}
        onEdit={updateFriendCategory}
        onDelete={(name, action, otherName) => {
          if (action === 'default') deleteFriendCategory(name, { action: 'default' });
          else if (action === 'other' && otherName) deleteFriendCategory(name, { action: 'other', name: otherName });
          else deleteFriendCategory(name, { action: 'clear' });
        }}
      />

      <CustomOptionListCard
        title="Hangout Types"
        description="Customize types used when logging hangouts and applying filters."
        options={data.hangoutTypes}
        usageCount={(name) => countHangoutsWithType(data.hangouts, name)}
        defaultFallbackLabel={DEFAULT_HANGOUT_TYPE}
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
