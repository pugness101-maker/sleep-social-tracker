import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { FriendsTab } from '../components/social/FriendsTab';
import { HangoutsTab } from '../components/social/HangoutsTab';
import { IdeasTab } from '../components/social/IdeasTab';
import { countActiveFriends } from '../lib/friend-archive';

export function SocialPage() {
  const { data } = useApp();
  const [active, setActive] = useState('friends');

  const friendCount = countActiveFriends(data.friends);
  const hangoutCount = data.hangouts.length;
  const ideaCount = data.ideas.length;

  const tabs = useMemo(
    () => [
      { id: 'friends', label: `Friends (${friendCount})` },
      { id: 'hangouts', label: `Hangouts (${hangoutCount})` },
      { id: 'ideas', label: `Ideas (${ideaCount})` },
    ],
    [friendCount, hangoutCount, ideaCount]
  );

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Social</h1>
        <p className="text-sm opacity-70 mt-1">Friends, hangouts, and activity ideas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <StatCard
          label="Active Friends"
          value={String(friendCount)}
          accent="social"
          icon="👥"
        />
        <StatCard
          label="Total Hangouts"
          value={String(hangoutCount)}
          accent="social"
          icon="🤝"
        />
        <StatCard
          label="Total Ideas"
          value={String(ideaCount)}
          accent="social"
          icon="💡"
        />
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
