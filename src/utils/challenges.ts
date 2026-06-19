import { Ride, ChallengeState, ChallengeDef } from '../types';
import { CHALLENGE_DEFS } from '../constants/challenges';
import { calcCurrentStreak, ridesThisWeek } from './streaks';
import { startOfDay, differenceInCalendarDays, parseISO } from 'date-fns';

function progressForChallenge(id: string, rides: Ride[], enrolledDate?: string, defs: ChallengeDef[] = CHALLENGE_DEFS): number {
  const def = defs.find((c) => c.id === id);
  if (!def) return 0;

  // Only count rides logged after the user joined this challenge
  const eligible = enrolledDate
    ? rides.filter((r) => new Date(r.date) >= new Date(enrolledDate))
    : rides;

  const streak = calcCurrentStreak(eligible);

  switch (def.type) {
    case 'streak':
      return Math.min(streak, def.target);

    case 'rides': {
      if (def.durationDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - def.durationDays);
        const recent = eligible.filter((r) => new Date(r.date) >= cutoff);
        return Math.min(recent.length, def.target);
      }
      return Math.min(eligible.length, def.target);
    }

    case 'duration': {
      const total = eligible.reduce((s, r) => s + r.duration, 0);
      return Math.min(total, def.target);
    }

    case 'calories': {
      const total = eligible.reduce((s, r) => s + (r.calories ?? 0), 0);
      return Math.min(total, def.target);
    }

    case 'distance': {
      if (def.durationDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - def.durationDays);
        const recent = eligible.filter((r) => new Date(r.date) >= cutoff);
        const total = recent.reduce((s, r) => s + (r.distance ?? 0), 0);
        return Math.min(total, def.target);
      }
      const total = eligible.reduce((s, r) => s + (r.distance ?? 0), 0);
      return Math.min(total, def.target);
    }

    default:
      return 0;
  }
}

export function evaluateChallenges(
  rides: Ride[],
  existing: ChallengeState[],
  defs: ChallengeDef[] = CHALLENGE_DEFS,
): ChallengeState[] {
  return existing.map((state) => {
    if (!state.enrolled || state.completed) return state;
    const progress = progressForChallenge(state.id, rides, state.enrolledDate, defs);
    const def = defs.find((c) => c.id === state.id);
    const completed = def ? progress >= def.target : false;
    return {
      ...state,
      progress,
      completed,
      completedDate: completed && !state.completedDate ? new Date().toISOString() : state.completedDate,
    };
  });
}

export function getPersonalRecords(rides: Ride[]) {
  if (rides.length === 0) return null;
  return {
    longestRide: Math.max(...rides.map((r) => r.duration)),
    longestDistance: Math.max(...rides.map((r) => r.distance ?? 0)),
    mostCalories: Math.max(...rides.map((r) => r.calories ?? 0)),
    highestResistance: Math.max(...rides.map((r) => r.resistance ?? 0)),
  };
}
