import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { getCatchUpFriends, formatDaysSinceLabel } from '../../lib/friend-activity';

interface CatchUpWidgetProps {
  onOpenFriend: (friendId: string) => void;
}

export function CatchUpWidget({ onOpenFriend }: CatchUpWidgetProps) {
  const { data } = useApp();
  const [includeNoHangouts, setIncludeNoHangouts] = useState(false);
  const includeArchived = data.settings.includeArchivedInDashboard;

  const catchUpFriends = getCatchUpFriends(
    data.friends,
    data.hangouts,
    includeNoHangouts,
    includeArchived
  ).slice(0, 8);

  return (
    <Card className="mb-0">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 text-left">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
            Need to Catch Up
          </h2>
          <p className="text-sm opacity-70 mt-1">Friends you have not seen in the longest time</p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={includeNoHangouts}
            onChange={(e) => setIncludeNoHangouts(e.target.checked)}
            className="rounded"
          />
          Include friends with no hangouts
        </label>
      </div>

      {catchUpFriends.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No friends to show yet. Log hangouts to track catch-up reminders.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {catchUpFriends.map(({ friend, daysSinceSeen, totalHangouts }) => (
            <li key={friend.id} className="flex items-center justify-between gap-3 py-3 text-left">
              <button
                type="button"
                onClick={() => onOpenFriend(friend.id)}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{friend.name}</p>
                <p className="text-xs opacity-70 mt-0.5">
                  {totalHangouts === 0 ? 'No hangouts logged' : `${totalHangouts} hangout${totalHangouts === 1 ? '' : 's'} total`}
                </p>
              </button>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">{formatDaysSinceLabel(daysSinceSeen)}</p>
                {daysSinceSeen != null && daysSinceSeen > 0 && (
                  <p className="text-xs opacity-60">{daysSinceSeen} day{daysSinceSeen === 1 ? '' : 's'}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
