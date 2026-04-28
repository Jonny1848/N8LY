import type { Event } from '@/components/EventCard';

export type EventRuntimeState = 'live' | 'upcoming' | 'ended' | 'inactive';

const DEFAULT_EVENT_DURATION_MS = 6 * 60 * 60 * 1000;

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function getEventRuntimeState(
  event: Event,
  now: Date = new Date()
): EventRuntimeState {
  const status = event.status?.toLowerCase();
  if (status === 'cancelled' || status === 'ended') return 'inactive';

  const startTime = toTime(event.date);
  if (!startTime) return 'inactive';

  const nowTime = now.getTime();
  const endTime = toTime(event.end_date) ?? startTime + DEFAULT_EVENT_DURATION_MS;

  if (nowTime < startTime) return 'upcoming';
  if (nowTime <= endTime && status !== 'sold_out') return 'live';
  return 'ended';
}

export function isEventLiveNow(event: Event, now?: Date): boolean {
  return getEventRuntimeState(event, now) === 'live';
}

export function isEventUpcoming(event: Event, now?: Date): boolean {
  return getEventRuntimeState(event, now) === 'upcoming';
}

export function getEventStateLabel(event: Event, now?: Date): string {
  const state = getEventRuntimeState(event, now);

  if (state === 'live') return 'Jetzt live';
  if (state === 'upcoming') return 'Demnächst';
  if (event.status?.toLowerCase() === 'sold_out') return 'Ausverkauft';
  return 'Nicht aktiv';
}
