import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Misc';
import type { HangoutIdea } from '../../types';

const ACTIVE_STATUSES = new Set(['Want to Try', 'Planned']);

export function UpcomingIdeasWidget() {
  const { data } = useApp();
  const navigate = useNavigate();

  const ideas = useMemo(() => {
    return data.ideas
      .filter((i) => ACTIVE_STATUSES.has(i.status))
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.priority - a.priority;
      })
      .slice(0, 5);
  }, [data.ideas]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-3 text-left">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
          Upcoming Ideas
        </h2>
        <button
          type="button"
          onClick={() => navigate('/social')}
          className="text-xs opacity-70 hover:opacity-100 shrink-0"
        >
          View all →
        </button>
      </div>
      {ideas.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No active ideas. Add some in Social → Ideas.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {ideas.map((idea: HangoutIdea) => (
            <li key={idea.id} className="py-2.5 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-heading)' }}>
                    {idea.isFavorite && <span className="mr-1">⭐</span>}
                    {idea.title}
                  </p>
                  <p className="text-xs opacity-70 mt-0.5">
                    {idea.type}{idea.location ? ` · ${idea.location}` : ''}
                  </p>
                </div>
                <Badge color="#6366f1">{idea.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
