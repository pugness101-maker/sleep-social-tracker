import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/Misc';
import { Icon, type IconName } from '../ui/Icon';
import { formatDateTime } from '../../lib/dates';
import { getDashboardRecentActivity } from '../../lib/dashboard-analytics';
import { HangoutFormModal } from '../social/HangoutFormModal';

interface RecentActivityWidgetProps {
  limit?: number;
}

const activityIcons: Record<string, IconName> = {
  sleep: 'bed',
  nap: 'nap',
  segment: 'target',
  hangout: 'handshake',
};

export function RecentActivityWidget({ limit = 12 }: RecentActivityWidgetProps) {
  const { data } = useApp();
  const navigate = useNavigate();
  const [editHangoutId, setEditHangoutId] = useState<string | null>(null);
  const recent = getDashboardRecentActivity(data, limit);

  const handleClick = (item: ReturnType<typeof getDashboardRecentActivity>[number]) => {
    if (item.kind === 'hangout' || item.kind === 'segment') {
      setEditHangoutId(item.hangoutId ?? null);
    } else {
      navigate('/sleep');
    }
  };

  return (
    <>
      <Card>
        <h2 className="text-[17px] font-semibold tracking-tight mb-3 text-left" style={{ color: 'var(--text-heading)' }}>
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Icon name="bed" size={20} />}
            title="No activity yet"
            description="Log sleep or a hangout to see your recent activity here."
            action={
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/sleep')}
                  className="text-[13px] font-semibold text-primary"
                >
                  Log sleep
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/social')}
                  className="text-[13px] font-semibold text-primary"
                >
                  Log hangout
                </button>
              </div>
            }
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="w-full flex items-center gap-3 py-2.5 text-left active:opacity-70 transition-opacity"
                >
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                    style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Icon name={activityIcons[item.kind] ?? 'social'} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] truncate" style={{ color: 'var(--text-heading)' }}>{item.title}</p>
                    <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{item.detail}</p>
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(item.timestamp)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <HangoutFormModal hangoutId={editHangoutId} open={!!editHangoutId} onClose={() => setEditHangoutId(null)} />
    </>
  );
}
