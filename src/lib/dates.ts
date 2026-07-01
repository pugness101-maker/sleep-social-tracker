import {
  differenceInMinutes,
  parseISO,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getDay,
  subDays,
  isSameDay,
} from 'date-fns';

export function generateId(): string {
  return crypto.randomUUID();
}

export function toLocalISO(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function parseLocal(iso: string): Date {
  return parseISO(iso);
}

export function formatTime(iso: string): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'h:mm a');
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'MMM d, yyyy');
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'MMM d, yyyy h:mm a');
}

export function formatDuration(minutes: number): string {
  if (minutes < 0 || isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function calcDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(0, differenceInMinutes(parseISO(end), parseISO(start)));
}

export function calcDurationMs(start: string, end?: string): number {
  if (!start) return 0;
  const startDate = parseISO(start);
  const endDate = end ? parseISO(end) : new Date();
  return Math.max(0, endDate.getTime() - startDate.getTime());
}

export function formatDurationLive(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function minutesToTimeOfDay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.round(totalMinutes % 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function avgMinutesToTime(avgMinutes: number): string {
  return minutesToTimeOfDay(Math.round(avgMinutes));
}

export function isToday(iso: string): boolean {
  return isSameDay(parseISO(iso), new Date());
}

export function isInRange(iso: string, start: Date, end: Date): boolean {
  return isWithinInterval(parseISO(iso), { start, end });
}

export function getWeekRange(date = new Date()) {
  return { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) };
}

export function getMonthRange(date = new Date()) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function getDayRange(date = new Date()) {
  return { start: startOfDay(date), end: endOfDay(date) };
}

export function weekdayLabel(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
}

export function getDaysInMonth(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days: Date[] = [];
  let current = start;
  while (current <= end) {
    days.push(current);
    current = new Date(current);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export { getDay, subDays, startOfDay, endOfDay, format, isSameDay, parseISO };
