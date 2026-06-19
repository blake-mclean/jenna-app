import { Ride, AchievementState, AchievementDef } from '../types';
import { ACHIEVEMENT_DEFS } from '../constants/achievements';
import { calcCurrentStreak } from './streaks';

export function evaluateAchievements(
  rides: Ride[],
  existing: AchievementState[],
  defs: AchievementDef[] = ACHIEVEMENT_DEFS,
): { updated: AchievementState[]; newlyEarned: string[] } {
  const streak = calcCurrentStreak(rides);
  const existingMap = new Map(existing.map((a) => [a.id, a]));
  const updated: AchievementState[] = [];
  const newlyEarned: string[] = [];

  for (const def of defs) {
    const prev = existingMap.get(def.id);
    if (prev?.earned) {
      updated.push(prev);
      continue;
    }
    const earned = def.check(rides, streak);
    if (earned) {
      updated.push({ id: def.id, earned: true, earnedDate: new Date().toISOString() });
      newlyEarned.push(def.id);
    } else {
      updated.push({ id: def.id, earned: false });
    }
  }

  return { updated, newlyEarned };
}
