import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { getTopFriendsThisMonth } from '../../lib/dashboard-analytics';

interface TopFriendsWidgetProps {
  onOpenFriend: (friendId: string) => void;
}

export function TopFriendsWidget({ onOpenFriend }: TopFriendsWidgetProps) {
  const { data } = useApp();
  const top = getTopFriendsThisMonth(data, 5, data.settings.includeArchivedInDashboard);

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold mb-1 text-left" style={{ color: 'var(--text-heading)' }}>
        Top Friends This Month
      </h2>
      <p className="text-sm opacity-70 mb-4 text-left">By hangout count and hours together</p>
      {top.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No hangouts logged this month yet.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {top.map(({ friend, hangoutCount, totalHours }) => (
            <li key={friend.id} className="flex items-center justify-between gap-3 py-3 text-left">
              <button type="button" onClick={() => onOpenFriend(friend.id)} className="font-medium text-sm hover:opacity-80">
                {friend.name}
              </button>
              <div className="text-right text-sm">
                <p>{hangoutCount} hangout{hangoutCount === 1 ? '' : 's'}</p>
                <p className="text-xs opacity-70">{totalHours.toFixed(1)}h</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
