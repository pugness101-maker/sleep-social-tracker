import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Icon, type IconName } from '../ui/Icon';

const ACTIONS: { label: string; icon: IconName; path: string }[] = [
  { label: 'Log Sleep', icon: 'bed', path: '/sleep' },
  { label: 'Social', icon: 'handshake', path: '/social' },
  { label: 'Insights', icon: 'insights', path: '/insights' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <Card>
      <h2 className="text-[17px] font-semibold tracking-tight mb-3 text-left" style={{ color: 'var(--text-heading)' }}>
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-[14px] font-medium active:opacity-70 transition-opacity"
            style={{ borderColor: 'var(--border)', color: 'var(--text-heading)', background: 'var(--bg)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              <Icon name={action.icon} size={18} />
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
