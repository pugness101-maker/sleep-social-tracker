import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Badge, EmptyState } from '../ui/Misc';
import { Icon } from '../ui/Icon';
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5);
  }, [data.ideas]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-3 text-left">
        <h2 className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Upcoming Ideas
        </h2>
        <button
          type="button"
          onClick={() => navigate('/social')}
          className="flex items-center gap-0.5 text-[13px] font-medium shrink-0 active:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          View all
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
      {ideas.length === 0 ? (
        <EmptyState
          icon={<Icon name="lightbulb" size={20} />}
          title="No active ideas"
          description="Add hangout ideas in Social to plan what's next."
          action={
            <button
              type="button"
              onClick={() => navigate('/social')}
              className="text-[13px] font-semibold text-primary"
            >
              Browse Ideas
            </button>
          }
        />
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {ideas.map((idea: HangoutIdea) => (
            <li key={idea.id} className="py-2.5 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-[15px] truncate flex items-center gap-1" style={{ color: 'var(--text-heading)' }}>
                    {idea.isFavorite && (
                      <Icon name="star" size={14} className="text-awake shrink-0" />
                    )}
                    {idea.title}
                  </p>
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {idea.category} · {idea.type}{idea.location ? ` · ${idea.location}` : ''}
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
