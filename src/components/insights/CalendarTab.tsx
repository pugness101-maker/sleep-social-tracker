import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Tabs } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  format,
  isSameDay,
  getWeekDays,
  getDaysInMonth,
  formatTime,
  startOfDay,
} from '../../lib/dates';
import { addDays } from 'date-fns';
import {
  buildCalendarEvents,
  filterCalendarEvents,
  eventsOnDay,
  formatEventTimeRange,
  plannedSummaryForDay,
  CAL_COLORS,
  CAL_LEGEND,
  DEFAULT_CAL_VISIBILITY,
  type CalEvent,
  type CalLegendKey,
} from '../../lib/calendar-events';

type CalView = 'day' | 'week' | 'month';

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
    const height =
      ((Math.min(event.end.getTime(), dayEnd.getTime()) - Math.max(event.start.getTime(), dayStart.getTime())) /
        dayMs) *
      100;
    const width = 100 / totalCols;
    const left = colIndex * width;
    return { ...event, top, height: Math.max(height, 2), width, left };
  });
}

function CalendarLegend({
  visibility,
  onToggle,
}: {
  visibility: Record<CalLegendKey, boolean>;
  onToggle: (key: CalLegendKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 text-xs">
      {CAL_LEGEND.map(({ key, label }) => {
        const active = visibility[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-opacity ${
              active ? '' : 'opacity-45'
            }`}
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            aria-pressed={active}
          >
            <span className="w-3 h-3 rounded shrink-0" style={{ background: CAL_COLORS[key] }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DayDetailModal({
  day,
  events,
  onClose,
}: {
  day: Date;
  events: CalEvent[];
  onClose: () => void;
}) {
  const dayEvents = eventsOnDay(events, day);
  const planned = dayEvents.filter((e) => e.type === 'planned_hangout');
  const completed = dayEvents.filter((e) => e.type === 'hangout');
  const sleep = dayEvents.filter((e) => e.type === 'sleep');
  const naps = dayEvents.filter((e) => e.type === 'nap');

  const renderList = (items: CalEvent[]) => (
    <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {items.map((event) => (
        <li key={event.id} className="py-2.5 flex items-start gap-3 text-left">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: event.color }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-heading)' }}>
              {event.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {formatEventTimeRange(event)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <Modal open onClose={onClose} title={format(day, 'EEEE, MMM d, yyyy')}>
      {dayEvents.length === 0 ? (
        <p className="text-sm text-left" style={{ color: 'var(--text-muted)' }}>
          Nothing scheduled or logged for this day.
        </p>
      ) : (
        <div className="space-y-4 text-left">
          {planned.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Planned ({planned.length})
              </h3>
              {renderList(planned)}
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Completed ({completed.length})
              </h3>
              {renderList(completed)}
            </section>
          )}
          {sleep.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Sleep ({sleep.length})
              </h3>
              {renderList(sleep)}
            </section>
          )}
          {naps.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Naps ({naps.length})
              </h3>
              {renderList(naps)}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

export function CalendarTab() {
  const { data } = useApp();
  const [view, setView] = useState<CalView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visibility, setVisibility] = useState(DEFAULT_CAL_VISIBILITY);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const events = useMemo(() => buildCalendarEvents(data), [data]);
  const visibleEvents = useMemo(() => filterCalendarEvents(events, visibility), [events, visibility]);

  const views = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ];

  const navigate = (dir: -1 | 1) => {
    if (view === 'day') setCurrentDate((d) => addDays(d, dir));
    else if (view === 'week') setCurrentDate((d) => addDays(d, dir * 7));
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const toggleLegend = (key: CalLegendKey) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
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

      <CalendarLegend visibility={visibility} onToggle={toggleLegend} />

      {view === 'day' && (
        <DayView date={currentDate} events={visibleEvents} onSelectDay={setSelectedDay} />
      )}
      {view === 'week' && (
        <WeekView date={currentDate} events={visibleEvents} onSelectDay={setSelectedDay} />
      )}
      {view === 'month' && (
        <MonthView date={currentDate} events={visibleEvents} onSelectDay={setSelectedDay} />
      )}

      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          events={visibleEvents}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

function DayView({
  date,
  events,
  onSelectDay,
}: {
  date: Date;
  events: CalEvent[];
  onSelectDay: (day: Date) => void;
}) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const laid = layoutOverlapping(events, dayStart, dayEnd);

  return (
    <Card>
      <button
        type="button"
        onClick={() => onSelectDay(date)}
        className="font-semibold mb-4 text-left hover:opacity-80 transition-opacity"
        style={{ color: 'var(--text-heading)' }}
      >
        {format(date, 'EEEE, MMM d, yyyy')}
      </button>
      <div className="relative h-[600px] border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="absolute w-full border-t text-xs opacity-40 pl-1"
            style={{ top: `${(h / 24) * 100}%`, borderColor: 'var(--border)' }}
          >
            {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'ha')}
          </div>
        ))}
        {laid.map((e) => (
          <div
            key={e.id}
            className="absolute rounded px-1 py-0.5 text-[10px] overflow-hidden z-10"
            style={{
              top: `${e.top}%`,
              height: `${e.height}%`,
              width: `${e.width - 1}%`,
              left: `${e.left}%`,
              background: e.color,
              color: e.type === 'planned_hangout' ? '#422006' : '#fff',
            }}
            title={e.label}
          >
            {e.label}
          </div>
        ))}
      </div>
    </Card>
  );
}

function WeekView({
  date,
  events,
  onSelectDay,
}: {
  date: Date;
  events: CalEvent[];
  onSelectDay: (day: Date) => void;
}) {
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
            <div
              key={day.toISOString()}
              className={`border rounded-lg min-h-[300px] ${isToday ? 'ring-2 ring-primary' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className="w-full text-center text-xs font-medium py-2 border-b hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)', color: 'var(--text-heading)' }}
              >
                {format(day, 'EEE d')}
              </button>
              <div className="relative h-[260px] p-0.5">
                {laid.map((e) => (
                  <div
                    key={e.id}
                    className="absolute rounded text-[8px] overflow-hidden px-0.5"
                    style={{
                      top: `${e.top}%`,
                      height: `${e.height}%`,
                      width: `${e.width - 2}%`,
                      left: `${e.left + 1}%`,
                      background: e.color,
                      color: e.type === 'planned_hangout' ? '#422006' : '#fff',
                    }}
                    title={`${e.label} (${formatTime(e.start.toISOString())} - ${formatTime(e.end.toISOString())})`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MonthView({
  date,
  events,
  onSelectDay,
}: {
  date: Date;
  events: CalEvent[];
  onSelectDay: (day: Date) => void;
}) {
  const days = getDaysInMonth(date);
  const firstDay = days[0].getDay();
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <Card>
      <h3 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-heading)' }}>
        {format(date, 'MMMM yyyy')}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2 opacity-70">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((b) => (
          <div key={`b-${b}`} />
        ))}
        {days.map((day) => {
          const dayEvents = eventsOnDay(events, day);
          const planned = dayEvents.filter((e) => e.type === 'planned_hangout');
          const other = dayEvents.filter((e) => e.type !== 'planned_hangout');
          const plannedLabel = plannedSummaryForDay(planned);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`border rounded-lg p-1 min-h-[70px] text-left active:opacity-80 transition-opacity ${
                isToday ? 'ring-2 ring-primary' : ''
              }`}
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--text-heading)' }}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {plannedLabel && (
                  <div
                    className="text-[9px] truncate rounded px-1 font-medium"
                    style={{ background: CAL_COLORS.planned_hangout, color: '#422006' }}
                  >
                    {plannedLabel}
                  </div>
                )}
                {other.slice(0, plannedLabel ? 2 : 3).map((e) => (
                  <div
                    key={e.id}
                    className="text-[9px] truncate rounded px-1 text-white"
                    style={{ background: e.color }}
                  >
                    {e.label}
                  </div>
                ))}
                {other.length > (plannedLabel ? 2 : 3) && (
                  <div className="text-[9px] opacity-60">+{other.length - (plannedLabel ? 2 : 3)} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
