import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const ACTIONS = [
  { label: 'Log Sleep', icon: '😴', path: '/sleep' },
  { label: 'Social / Hangouts', icon: '🤝', path: '/social' },
  { label: 'View Insights', icon: '📊', path: '/insights' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
] as const;

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <Card>
      <h2 className="text-base font-semibold mb-3 text-left" style={{ color: 'var(--text-heading)' }}>
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.path}
            variant="secondary"
            size="sm"
            type="button"
            className="justify-start gap-2 h-auto py-2.5"
            onClick={() => navigate(action.path)}
          >
            <span aria-hidden>{action.icon}</span>
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
