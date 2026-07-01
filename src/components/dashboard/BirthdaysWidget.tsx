import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { getUpcomingBirthdays } from '../../lib/dashboard-analytics';

interface BirthdaysWidgetProps {
  onOpenFriend: (friendId: string) => void;
}

export function BirthdaysWidget({ onOpenFriend }: BirthdaysWidgetProps) {
  const { data } = useApp();
  const upcoming = getUpcomingBirthdays(data, 6, data.settings.includeArchivedInDashboard);

  return (
    <Card className="mb-0">
      <h2 className="text-lg font-semibold mb-1 text-left" style={{ color: 'var(--text-heading)' }}>
        Upcoming Birthdays
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-sm opacity-70 mt-3 text-left">No birthdays on file. Add birthdays on friend profiles.</p>
      ) : (
        <ul className="divide-y mt-3" style={{ borderColor: 'var(--border)' }}>
          {upcoming.map(({ friend, displayDate, daysAway }) => (
            <li key={friend.id} className="flex items-center justify-between gap-3 py-3 text-left">
              <button type="button" onClick={() => onOpenFriend(friend.id)} className="font-medium text-sm hover:opacity-80">
                🎂 {friend.name}
              </button>
              <div className="text-right text-sm">
                <p>{displayDate}</p>
                <p className="text-xs opacity-70">
                  {daysAway === 0 ? 'Today!' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
