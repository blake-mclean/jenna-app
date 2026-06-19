import { Ride } from '../types';

export const XP_PER_ACHIEVEMENT = 75;

export function xpForRide(ride: Ride): number {
  return Math.floor(ride.distance ?? 0); // 1 XP per km
}

export function xpForChallenge(target: number): number {
  if (target <= 10) return 50;
  if (target <= 50) return 100;
  if (target <= 200) return 150;
  return 200;
}

export function xpForLevelUp(newLevel: number): number {
  return 100 * newLevel;
}
