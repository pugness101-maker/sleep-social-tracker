import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/Misc';
import { Icon } from '../ui/Icon';
import { getCatchUpFriends, formatDaysSinceLabel } from '../../lib/friend-activity';

interface CatchUpWidgetProps {
  onOpenFriend: (friendId: string) => void;
}

export function CatchUpWidget({ onOpenFriend }: CatchUpWidgetProps) {
  const { data } = useApp();
  const navigate = useNavigate();
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
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3 text-left">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Need to Catch Up
          </h2>
          <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            Friends you have not seen in a while
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer shrink-0" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={includeNoHangouts}
            onChange={(e) => setIncludeNoHangouts(e.target.checked)}
            className="rounded"
          />
          Include no hangouts
        </label>
      </div>

      {catchUpFriends.length === 0 ? (
        <EmptyState
          icon={<Icon name="handshake" size={20} />}
          title="No hangouts yet"
          description="Log a hangout to see who you should catch up with."
          action={
            <button
              type="button"
              onClick={() => navigate('/social')}
              className="text-[13px] font-semibold text-primary"
            >
              Go to Social
            </button>
          }
        />
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {catchUpFriends.map(({ friend, daysSinceSeen, totalHangouts }) => (
            <li key={friend.id} className="flex items-center justify-between gap-3 py-2.5 text-left">
              <button
                type="button"
                onClick={() => onOpenFriend(friend.id)}
                className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
              >
                <p className="font-medium text-[15px]" style={{ color: 'var(--text-heading)' }}>{friend.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {totalHangouts === 0 ? 'No hangouts logged' : `${totalHangouts} hangout${totalHangouts === 1 ? '' : 's'}`}
                </p>
              </button>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {formatDaysSinceLabel(daysSinceSeen)}
                </p>
                {daysSinceSeen != null && daysSinceSeen > 0 && (
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {daysSinceSeen} day{daysSinceSeen === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
