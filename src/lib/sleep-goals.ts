import type { AppSettings } from '../types';

const MINUTES_PER_DAY = 24 * 60;

/** Parse "HH:mm" to minutes from midnight */
export function timeStringToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function goalHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function wrapMinutes(totalMinutes: number): number {
  return ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function addMinutes(baseMinutes: number, deltaMinutes: number): number {
  return wrapMinutes(baseMinutes + deltaMinutes);
}

export function subtractMinutes(baseMinutes: number, deltaMinutes: number): number {
  return wrapMinutes(baseMinutes - deltaMinutes);
}

/** Minutes from midnight → "HH:mm" (24h) */
export function minutesToTimeString(totalMinutes: number): string {
  const wrapped = wrapMinutes(totalMinutes);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Minutes from midnight → "h:mm a" display */
export function minutesToDisplayTime(totalMinutes: number): string {
  const wrapped = wrapMinutes(totalMinutes);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Bedtime = wake-up time − sleep goal (minute arithmetic, wraps at midnight). */
export function getRecommendedBedtimeMinutes(settings: Pick<AppSettings, 'targetWakeUpTime' | 'sleepGoalHours'>): number {
  const wakeMin = timeStringToMinutes(settings.targetWakeUpTime);
  const goalMin = goalHoursToMinutes(settings.sleepGoalHours);
  return subtractMinutes(wakeMin, goalMin);
}

/** Wake-up time = bedtime + sleep goal (minute arithmetic, wraps at midnight). */
export function getRecommendedWakeTimeMinutes(settings: Pick<AppSettings, 'targetBedtime' | 'sleepGoalHours'>): number {
  const bedMin = timeStringToMinutes(settings.targetBedtime);
  const goalMin = goalHoursToMinutes(settings.sleepGoalHours);
  return addMinutes(bedMin, goalMin);
}

export function normalizeSleepAutoCalcSettings(
  settings: Pick<AppSettings, 'autoCalculateBedtime' | 'autoCalculateWakeTime'>
): Pick<AppSettings, 'autoCalculateBedtime' | 'autoCalculateWakeTime'> {
  if (settings.autoCalculateBedtime && settings.autoCalculateWakeTime) {
    return { autoCalculateBedtime: true, autoCalculateWakeTime: false };
  }
  return {
    autoCalculateBedtime: settings.autoCalculateBedtime,
    autoCalculateWakeTime: settings.autoCalculateWakeTime,
  };
}

export function getSleepSchedule(settings: AppSettings) {
  const wakeMin = timeStringToMinutes(settings.targetWakeUpTime);
  const bedMin = timeStringToMinutes(settings.targetBedtime);
  const goalMin = goalHoursToMinutes(settings.sleepGoalHours);

  let recommendedBedtimeMin: number;
  let recommendedWakeMin: number;

  if (settings.autoCalculateBedtime) {
    recommendedBedtimeMin = subtractMinutes(wakeMin, goalMin);
    recommendedWakeMin = wakeMin;
  } else if (settings.autoCalculateWakeTime) {
    recommendedBedtimeMin = bedMin;
    recommendedWakeMin = addMinutes(bedMin, goalMin);
  } else {
    recommendedBedtimeMin = bedMin;
    recommendedWakeMin = wakeMin;
  }

  const effectiveBedtimeMin = settings.autoCalculateBedtime ? recommendedBedtimeMin : bedMin;
  const effectiveWakeMin = settings.autoCalculateWakeTime ? recommendedWakeMin : wakeMin;

  return {
    recommendedBedtime: minutesToDisplayTime(recommendedBedtimeMin),
    recommendedWakeTime: minutesToDisplayTime(recommendedWakeMin),
    recommendedBedtime24: minutesToTimeString(recommendedBedtimeMin),
    recommendedWakeTime24: minutesToTimeString(recommendedWakeMin),
    effectiveBedtime: minutesToDisplayTime(effectiveBedtimeMin),
    effectiveWakeTime: minutesToDisplayTime(effectiveWakeMin),
    goalHours: settings.sleepGoalHours,
    autoCalculateBedtime: settings.autoCalculateBedtime,
    autoCalculateWakeTime: settings.autoCalculateWakeTime,
  };
}

/** sleepDebtMinutes = goalMinutes - actualMinutes (positive = debt, negative = surplus) */
export function calcSleepDebtMinutes(goalMinutes: number, actualMinutes: number): number {
  return goalMinutes - actualMinutes;
}

export function formatSleepDebt(debtMinutes: number): string {
  if (debtMinutes === 0) return 'Met goal';
  const abs = Math.abs(debtMinutes);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  let timeStr: string;
  if (h === 0) timeStr = `${m}m`;
  else if (m === 0) timeStr = `${h}h`;
  else timeStr = `${h}h ${m}m`;
  if (debtMinutes > 0) return `${timeStr} sleep debt`;
  return `${timeStr} over goal`;
}

/** @deprecated use formatSleepDebt with calcSleepDebtMinutes; diff = actual - goal */
export function formatSleepGoalDiff(diffMinutes: number): string {
  return formatSleepDebt(-diffMinutes);
}

export function formatGoalProgressPercent(actualMinutes: number, goalMinutes: number): string {
  if (goalMinutes <= 0) return '—';
  return `${Math.round((actualMinutes / goalMinutes) * 100)}%`;
}
