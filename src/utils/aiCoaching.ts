import { supabase } from '../lib/supabase';
import { Ride } from '../types';

export interface RideRecapPayload {
  newRides: Ride[];
  allRides: Ride[];
  sport: 'cycling' | 'running';
  distanceUnit: 'km' | 'miles';
}

export interface ReflectionPayload {
  rides: Ride[];
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  sport: 'cycling' | 'running';
  distanceUnit: 'km' | 'miles';
  period: 'weekly' | 'monthly';
}

export async function generateRideRecap(payload: RideRecapPayload): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ride-recap', { body: payload });
  if (error) throw error;
  return (data as { insight: string }).insight;
}

export async function generateReflection(payload: ReflectionPayload): Promise<string> {
  const { data, error } = await supabase.functions.invoke('weekly-reflection', { body: payload });
  if (error) throw error;
  return (data as { insight: string }).insight;
}

export interface NudgePayload {
  rides: Ride[];
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  ridesThisWeek: number;
  sport: 'cycling' | 'running';
  distanceUnit: 'km' | 'miles';
  enrolledChallenges: Array<{ name: string; pct: number }>;
  availableChallenges: Array<{ name: string; description: string }>;
  achievementsEarned: number;
  totalAchievements: number;
}

export async function generateNudge(payload: NudgePayload): Promise<string> {
  const { data, error } = await supabase.functions.invoke('smart-nudge', { body: payload });
  if (error) throw error;
  return (data as { insight: string }).insight;
}
