import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { getThisWeekSocial } from '../../lib/dashboard-analytics';

export function ThisWeekSocialWidget() {
  const { data } = useApp();
  const week = getThisWeekSocial(data);

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold mb-1 text-left" style={{ color: 'var(--text-heading)' }}>
        This Week Social
      </h2>
      <div className="grid grid-cols-3 gap-4 mt-4 text-left">
        <div>
          <span className="text-xs opacity-60 block">Hangouts</span>
          <span className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>{week.totalHangouts}</span>
        </div>
        <div>
          <span className="text-xs opacity-60 block">Social Hours</span>
          <span className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>{week.totalHours.toFixed(1)}h</span>
        </div>
        <div>
          <span className="text-xs opacity-60 block">Top Type</span>
          <span className="text-sm font-medium">{week.topType ?? '—'}</span>
        </div>
      </div>
    </Card>
  );
}
