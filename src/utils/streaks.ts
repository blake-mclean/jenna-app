import { Ride } from '../types';
import { startOfDay, differenceInCalendarDays, parseISO } from 'date-fns';

function uniqueDays(rides: Ride[]): Date[] {
  const seen = new Set<string>();
  const days: Date[] = [];
  for (const r of rides) {
    const d = startOfDay(parseISO(r.date)).toISOString();
    if (!seen.has(d)) {
      seen.add(d);
      days.push(startOfDay(parseISO(r.date)));
    }
  }
  return days.sort((a, b) => b.getTime() - a.getTime()); // newest first
}

export function calcCurrentStreak(rides: Ride[]): number {
  const days = uniqueDays(rides);
  if (days.length === 0) return 0;

  const today = startOfDay(new Date());
  const diff0 = differenceInCalendarDays(today, days[0]);
  if (diff0 > 1) return 0; // last ride was >1 day ago, streak broken

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (differenceInCalendarDays(days[i - 1], days[i]) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calcLongestStreak(rides: Ride[]): number {
  const days = uniqueDays(rides).reverse(); // oldest first
  if (days.length === 0) return 0;

  let max = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    if (differenceInCalendarDays(days[i], days[i - 1]) === 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}

export function ridesThisWeek(rides: Ride[]): Ride[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfWeek = startOfDay(new Date(now));
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  return rides.filter((r) => new Date(r.date) >= startOfWeek);
}

export function ridesToday(rides: Ride[]): Ride[] {
  const today = startOfDay(new Date()).toISOString();
  return rides.filter((r) => startOfDay(new Date(r.date)).toISOString() === today);
}
