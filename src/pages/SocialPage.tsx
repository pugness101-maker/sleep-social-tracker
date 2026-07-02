import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { PageIntro } from '../components/layout/PageIntro';
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
      <PageIntro
        title="Social"
        description="Friends, hangouts, and activity ideas"
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 md:mb-6">
        <StatCard
          label="Friends"
          value={String(friendCount)}
          accent="social"
          icon="users"
        />
        <StatCard
          label="Hangouts"
          value={String(hangoutCount)}
          accent="social"
          icon="handshake"
        />
        <StatCard
          label="Ideas"
          value={String(ideaCount)}
          accent="social"
          icon="lightbulb"
        />
      </div>

      <div className="mb-4 md:mb-6">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      {active === 'friends' && <FriendsTab />}
      {active === 'hangouts' && <HangoutsTab />}
      {active === 'ideas' && <IdeasTab />}
    </div>
  );
}
