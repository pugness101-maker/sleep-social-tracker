import { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { FriendsTab } from '../components/social/FriendsTab';
import { HangoutsTab } from '../components/social/HangoutsTab';
import { IdeasTab } from '../components/social/IdeasTab';

const tabs = [
  { id: 'friends', label: 'Friends' },
  { id: 'hangouts', label: 'Hangouts' },
  { id: 'ideas', label: 'Ideas' },
];

export function SocialPage() {
  const [active, setActive] = useState('friends');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Social</h1>
        <p className="text-sm opacity-70 mt-1">Friends, hangouts, and activity ideas</p>
      </div>
      <div className="mb-6">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      {active === 'friends' && <FriendsTab />}
      {active === 'hangouts' && <HangoutsTab />}
      {active === 'ideas' && <IdeasTab />}
    </div>
  );
}
