import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Tabs } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  format,
  parseISO,
  isSameDay,
  getWeekDays,
  getDaysInMonth,
  calcDurationMinutes,
  formatDuration,
  formatTime,
  startOfDay,
} from '../../lib/dates';
import { addDays, subDays } from 'date-fns';
import type { AppData } from '../../types';

type CalView = 'day' | 'week' | 'month' | 'timeline';

interface CalEvent {
  id: string;
  type: 'sleep' | 'nap' | 'awake' | 'hangout';
  label: string;
  start: Date;
  end: Date;
  color: string;
}

function buildEvents(data: AppData): CalEvent[] {
  const events: CalEvent[] = [];

  data.sleepEntries.forEach((s) => {
    events.push({
      id: s.id,
      type: 'sleep',
      label: `Sleep ${formatDuration(calcDurationMinutes(s.sleepStart, s.wakeUp))}`,
      start: parseISO(s.sleepStart),
      end: parseISO(s.wakeUp),
      color: '#818cf8',
    });
  });

  data.napEntries.forEach((n) => {
    events.push({
      id: n.id,
      type: 'nap',
      label: `Nap ${formatDuration(calcDurationMinutes(n.napStart, n.napEnd))}`,
      start: parseISO(n.napStart),
      end: parseISO(n.napEnd),
      color: '#a78bfa',
    });
  });

  data.hangouts.forEach((h) => {
    const names = h.friendIds.map((id) => data.friends.find((f) => f.id === id)?.name ?? '?').join(', ');
    events.push({
      id: h.id,
      type: 'hangout',
      label: `${h.type}: ${names || 'Hangout'}`,
      start: parseISO(h.startTime),
      end: parseISO(h.endTime),
      color: '#34d399',
    });
  });

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function layoutOverlapping(events: CalEvent[], dayStart: Date, dayEnd: Date) {
  const dayEvents = events.filter((e) => e.end > dayStart && e.start < dayEnd);
  const columns: CalEvent[][] = [];

  dayEvents.forEach((event) => {
    let placed = false;
    for (const col of columns) {
      const overlaps = col.some((e) => e.start < event.end && e.end > event.start);
      if (!overlaps) {
        col.push(event);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([event]);
  });

  return dayEvents.map((event) => {
    const colIndex = columns.findIndex((col) => col.includes(event));
    const totalCols = columns.length;
    const dayMs = dayEnd.getTime() - dayStart.getTime();
    const top = ((Math.max(event.start.getTime(), dayStart.getTime()) - dayStart.getTime()) / dayMs) * 100;
    const height = ((Math.min(event.end.getTime(), dayEnd.getTime()) - Math.max(event.start.getTime(), dayStart.getTime())) / dayMs) * 100;
    const width = 100 / totalCols;
    const left = colIndex * width;
    return { ...event, top, height: Math.max(height, 2), width, left };
  });
}

export function CalendarTab() {
  const { data } = useApp();
  const [view, setView] = useState<CalView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo(() => buildEvents(data), [data]);

  const views = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'timeline', label: 'Timeline' },
  ];

  const navigate = (dir: -1 | 1) => {
    if (view === 'day') setCurrentDate((d) => addDays(d, dir));
    else if (view === 'week') setCurrentDate((d) => addDays(d, dir * 7));
    else if (view === 'month') setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    else setCurrentDate((d) => addDays(d, dir));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Tabs tabs={views} active={view} onChange={(v) => setView(v as CalView)} />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(-1)}>←</Button>
          <Button size="sm" variant="ghost" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate(1)}>→</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sleep inline-block" /> Sleep</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-nap inline-block" /> Naps</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-social inline-block" /> Hangouts</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-awake inline-block" /> Awake gaps</span>
      </div>

      {view === 'day' && <DayView date={currentDate} events={events} />}
      {view === 'week' && <WeekView date={currentDate} events={events} />}
      {view === 'month' && <MonthView date={currentDate} events={events} />}
      {view === 'timeline' && <TimelineView date={currentDate} events={events} />}
    </div>
  );
}

function DayView({ date, events }: { date: Date; events: CalEvent[] }) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const laid = layoutOverlapping(events, dayStart, dayEnd);

  return (
    <Card>
      <h3 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>{format(date, 'EEEE, MMM d, yyyy')}</h3>
      <div className="relative h-[600px] border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="absolute w-full border-t text-xs opacity-40 pl-1" style={{ top: `${(h / 24) * 100}%`, borderColor: 'var(--border)' }}>
            {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'ha')}
          </div>
        ))}
        {laid.map((e) => (
          <div
            key={e.id}
            className="absolute rounded px-1 py-0.5 text-[10px] text-white overflow-hidden z-10"
            style={{ top: `${e.top}%`, height: `${e.height}%`, width: `${e.width - 1}%`, left: `${e.left}%`, background: e.color }}
            title={e.label}
          >
            {e.label}
          </div>
        ))}
      </div>
    </Card>
  );
}

function WeekView({ date, events }: { date: Date; events: CalEvent[] }) {
  const days = getWeekDays(date);

  return (
    <Card>
      <h3 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>
        Week of {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
      </h3>
      <div className="grid grid-cols-7 gap-1 overflow-x-auto min-w-[600px]">
        {days.map((day) => {
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const laid = layoutOverlapping(events, dayStart, dayEnd);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()} className={`border rounded-lg min-h-[300px] ${isToday ? 'ring-2 ring-primary' : ''}`} style={{ borderColor: 'var(--border)' }}>
              <div className="text-center text-xs font-medium py-2 border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-heading)' }}>
                {format(day, 'EEE d')}
              </div>
              <div className="relative h-[260px] p-0.5">
                {laid.map((e) => (
                  <div
                    key={e.id}
                    className="absolute rounded text-[8px] text-white overflow-hidden px-0.5"
                    style={{ top: `${e.top}%`, height: `${e.height}%`, width: `${e.width - 2}%`, left: `${e.left + 1}%`, background: e.color }}
                    title={`${e.label} (${formatTime(e.start.toISOString())} - ${formatTime(e.end.toISOString())})`}
                  >
                    {e.type === 'hangout' ? '🤝' : e.type === 'nap' ? '💤' : '😴'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MonthView({ date, events }: { date: Date; events: CalEvent[] }) {
  const days = getDaysInMonth(date);
  const firstDay = days[0].getDay();
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <Card>
      <h3 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>{format(date, 'MMMM yyyy')}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2 opacity-70">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((b) => <div key={`b-${b}`} />)}
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.start, day) || isSameDay(e.end, day) || (e.start < day && e.end > day));
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`border rounded-lg p-1 min-h-[70px] text-left ${isToday ? 'ring-2 ring-primary' : ''}`} style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-heading)' }}>{format(day, 'd')}</span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <div key={e.id} className="text-[9px] truncate rounded px-1 text-white" style={{ background: e.color }}>{e.label}</div>
                ))}
                {dayEvents.length > 3 && <div className="text-[9px] opacity-60">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TimelineView({ date, events }: { date: Date; events: CalEvent[] }) {
  const rangeStart = subDays(startOfDay(date), 3);
  const rangeEnd = addDays(startOfDay(date), 4);
  const filtered = events.filter((e) => e.end > rangeStart && e.start < rangeEnd);

  return (
    <Card>
      <h3 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>
        Timeline: {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
      </h3>
      {filtered.length === 0 ? (
        <p className="text-sm opacity-70 text-left">No events in this range.</p>
      ) : (
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ background: 'var(--border)' }} />
          {filtered.map((e) => (
            <div key={e.id} className="relative pb-6 text-left">
              <div className="absolute -left-4 w-3 h-3 rounded-full border-2 border-white" style={{ background: e.color }} />
              <p className="text-xs opacity-60">{format(e.start, 'MMM d, h:mm a')} – {format(e.end, 'h:mm a')}</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{e.label}</p>
              <span className="text-xs capitalize opacity-70">{e.type}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
