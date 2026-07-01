import type { AppSettings } from '../types';

/** Parse "HH:mm" to minutes from midnight */
export function timeStringToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minutes from midnight → "HH:mm" (24h) */
export function minutesToTimeString(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = Math.round(wrapped % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Minutes from midnight → "h:mm a" display */
export function minutesToDisplayTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = Math.round(wrapped % 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function getRecommendedBedtimeMinutes(settings: AppSettings): number {
  const wakeMin = timeStringToMinutes(settings.targetWakeUpTime);
  const goalMin = settings.sleepGoalHours * 60;
  return wakeMin - goalMin;
}

export function getRecommendedWakeTimeMinutes(settings: AppSettings): number {
  const bedMin = timeStringToMinutes(settings.targetBedtime);
  const goalMin = settings.sleepGoalHours * 60;
  return bedMin + goalMin;
}

export function getSleepSchedule(settings: AppSettings) {
  const recommendedBedtimeMin = getRecommendedBedtimeMinutes(settings);
  const recommendedWakeMin = getRecommendedWakeTimeMinutes(settings);

  const effectiveBedtimeMin = settings.autoCalculateBedtime
    ? recommendedBedtimeMin
    : timeStringToMinutes(settings.targetBedtime);

  const effectiveWakeMin = settings.autoCalculateWakeTime
    ? recommendedWakeMin
    : timeStringToMinutes(settings.targetWakeUpTime);

  return {
    recommendedBedtime: minutesToDisplayTime(recommendedBedtimeMin),
    recommendedWakeTime: minutesToDisplayTime(recommendedWakeMin),
    recommendedBedtime24: minutesToTimeString(recommendedBedtimeMin),
    recommendedWakeTime24: minutesToTimeString(recommendedWakeMin),
    effectiveBedtime: minutesToDisplayTime(effectiveBedtimeMin),
    effectiveWakeTime: minutesToDisplayTime(effectiveWakeMin),
    goalHours: settings.sleepGoalHours,
  };
}

export function formatSleepGoalDiff(diffMinutes: number): string {
  if (diffMinutes === 0) return 'On goal';
  const sign = diffMinutes > 0 ? '+' : '−';
  const abs = Math.abs(diffMinutes);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  if (h === 0) return `${sign}${m}m vs goal`;
  if (m === 0) return `${sign}${h}h vs goal`;
  return `${sign}${h}h ${m}m vs goal`;
}

export function formatGoalProgressPercent(actualMinutes: number, goalMinutes: number): string {
  if (goalMinutes <= 0) return '—';
  return `${Math.round((actualMinutes / goalMinutes) * 100)}%`;
}
