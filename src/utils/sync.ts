import { AppData, Ride } from '../types';
import { supabase } from '../lib/supabase';

// ─── Push ─────────────────────────────────────────────────────────────────────
// Upserts the full local state to Supabase. Safe to call any time — rides are
// upserted by ID, so re-pushing the same data is idempotent.

export async function pushToSupabase(userId: string, data: AppData): Promise<void> {
  await Promise.all([
    supabase.from('profiles').upsert({
      id: userId,
      name: data.profile.name,
      weekly_ride_goal: data.profile.weeklyRideGoal,
      distance_unit: data.profile.distanceUnit,
      member_since: data.profile.memberSince,
      equipped_badge_id: data.profile.equippedBadgeId ?? null,
      updated_at: new Date().toISOString(),
    }),

    data.rides.length > 0
      ? supabase.from('rides').upsert(
          data.rides.map((r) => ({
            id: r.id,
            user_id: userId,
            date: r.date,
            duration: r.duration,
            distance: r.distance ?? null,
            calories: r.calories ?? null,
            resistance: r.resistance ?? null,
            avg_heart_rate: r.avgHeartRate ?? null,
            instructor: r.instructor ?? null,
            notes: r.notes ?? null,
          }))
        )
      : Promise.resolve(),

    supabase.from('user_data').upsert({
      user_id: userId,
      achievements: data.achievements,
      challenges: data.challenges,
      unlocked_badges: data.unlockedBadges,
      notifications: data.notifications,
      has_seen_onboarding: data.hasSeenOnboarding,
      updated_at: new Date().toISOString(),
    }),
  ]);
}

// ─── Pull ─────────────────────────────────────────────────────────────────────
// Fetches all user data from Supabase and merges with local state.
// Strategy: Supabase wins for profile/settings; rides are unioned (both local
// and remote are kept, deduplicated by ID).

export async function pullFromSupabase(
  userId: string,
  localData: AppData,
): Promise<AppData> {
  const [profileRes, ridesRes, userDataRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('rides').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('user_data').select('*').eq('user_id', userId).single(),
  ]);

  // If either critical table is missing, return local data unchanged
  if (profileRes.error || userDataRes.error) return localData;

  const p  = profileRes.data;
  const ud = userDataRes.data;

  const remoteRides: Ride[] = (ridesRes.data ?? []).map((r: any) => ({
    id: r.id,
    date: r.date,
    duration: r.duration,
    distance: r.distance ?? undefined,
    calories: r.calories ?? undefined,
    resistance: r.resistance ?? undefined,
    avgHeartRate: r.avg_heart_rate ?? undefined,
    instructor: r.instructor ?? undefined,
    notes: r.notes ?? undefined,
  }));

  // Union: remote rides + any local rides not yet on the server
  const remoteIds = new Set(remoteRides.map((r) => r.id));
  const mergedRides = [
    ...remoteRides,
    ...localData.rides.filter((r) => !remoteIds.has(r.id)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    rides: mergedRides,
    profile: {
      name: p.name,
      weeklyRideGoal: p.weekly_ride_goal,
      distanceUnit: p.distance_unit as 'km' | 'miles',
      memberSince: p.member_since,
      equippedBadgeId: p.equipped_badge_id ?? undefined,
    },
    achievements:      ud.achievements      ?? localData.achievements,
    challenges:        ud.challenges        ?? localData.challenges,
    unlockedBadges:    ud.unlocked_badges   ?? localData.unlockedBadges,
    notifications:     ud.notifications     ?? localData.notifications,
    hasSeenOnboarding: ud.has_seen_onboarding || localData.hasSeenOnboarding,
  };
}

// ─── Targeted delete ──────────────────────────────────────────────────────────
// Called directly when the user deletes a ride, because pushToSupabase only
// upserts and cannot remove rows.

export async function deleteRideRemote(userId: string, rideId: string): Promise<void> {
  await supabase.from('rides').delete().eq('id', rideId).eq('user_id', userId);
}

// ─── Full reset ───────────────────────────────────────────────────────────────
// Wipes all rides for the user in Supabase, then pushes the (empty) reset state.

export async function resetUserDataRemote(userId: string, data: AppData): Promise<void> {
  await supabase.from('rides').delete().eq('user_id', userId);
  await pushToSupabase(userId, data);
}
