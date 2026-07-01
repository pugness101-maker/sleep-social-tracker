import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { formatDateTime } from '../../lib/dates';
import { getDashboardRecentActivity } from '../../lib/dashboard-analytics';
import { HangoutFormModal } from '../social/HangoutFormModal';

export function RecentActivityWidget() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [editHangoutId, setEditHangoutId] = useState<string | null>(null);
  const recent = getDashboardRecentActivity(data, 12);

  const icon = (kind: string) => {
    if (kind === 'sleep') return '😴';
    if (kind === 'nap') return '💤';
    if (kind === 'segment') return '🎯';
    return '👥';
  };

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
        <h2 className="text-lg font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm opacity-70 text-left">No activity yet. Start tracking sleep or hangouts!</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:opacity-90"
                >
                  <span className="text-xl">{icon(item.kind)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{item.title}</p>
                    <p className="text-xs opacity-70">{item.detail}</p>
                  </div>
                  <span className="text-xs opacity-60 shrink-0">{formatDateTime(item.timestamp)}</span>
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
