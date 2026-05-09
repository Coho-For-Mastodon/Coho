import { SCHEDULE_MIN_LEAD_MS } from './types';

export type ScheduleValidationError = 'missing' | 'invalid' | 'tooSoon';

export function toInputDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toInputTimeValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getDefaultScheduleDateTime(now = Date.now()): {
  date: string;
  time: string;
} {
  const suggestedDate = new Date(now + 30 * 60 * 1000);
  suggestedDate.setSeconds(0, 0);
  const minuteRemainder = suggestedDate.getMinutes() % 5;
  if (minuteRemainder !== 0) {
    suggestedDate.setMinutes(
      suggestedDate.getMinutes() + (5 - minuteRemainder)
    );
  }

  return {
    date: toInputDateValue(suggestedDate),
    time: toInputTimeValue(suggestedDate),
  };
}

export function getScheduleMinDate(now = Date.now()): string {
  return toInputDateValue(new Date(now + SCHEDULE_MIN_LEAD_MS));
}

export function getScheduleMinTime(
  scheduleDate: string,
  now = Date.now()
): string {
  if (!scheduleDate) return '';

  const minDate = new Date(now + SCHEDULE_MIN_LEAD_MS);
  if (scheduleDate !== toInputDateValue(minDate)) return '';

  return toInputTimeValue(minDate);
}

export function parseScheduledDateTime(
  scheduleDate: string,
  scheduleTime: string
): Date | null {
  if (!scheduleDate || !scheduleTime) return null;

  const hasSeconds = scheduleTime.split(':').length > 2;
  const timeValue = hasSeconds ? scheduleTime : `${scheduleTime}:00`;
  const parsed = new Date(`${scheduleDate}T${timeValue}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function resolveScheduledAtForSubmission(options: {
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  now?: number;
}): { scheduledAt: string | null; error: ScheduleValidationError | null } {
  const {
    scheduleEnabled,
    scheduleDate,
    scheduleTime,
    now = Date.now(),
  } = options;

  if (!scheduleEnabled) {
    return { scheduledAt: null, error: null };
  }

  if (!scheduleDate || !scheduleTime) {
    return { scheduledAt: null, error: 'missing' };
  }

  const parsed = parseScheduledDateTime(scheduleDate, scheduleTime);
  if (!parsed) {
    return { scheduledAt: null, error: 'invalid' };
  }

  if (parsed.getTime() < now + SCHEDULE_MIN_LEAD_MS) {
    return { scheduledAt: null, error: 'tooSoon' };
  }

  return { scheduledAt: parsed.toISOString(), error: null };
}

export function formatScheduledDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
