import { AppData, Ride } from '../types';
import { supabase } from '../lib/supabase';

// ─── Push ─────────────────────────────────────────────────────────────────────
// Upserts the full local state to Supabase. Safe to call any time — rides are
// upserted by ID, so re-pushing the same data is idempotent.

export async function pushToSupabase(userId: string, data: AppData): Promise<void> {
  const tPush = performance.now();
  const allRides = [
    ...data.cycling.rides.map((r) => ({ ...r, sport: 'cycling' })),
    ...data.running.rides.map((r) => ({ ...r, sport: 'running' })),
  ];

  await Promise.all([
    supabase.from('profiles').upsert({
      id: userId,
      name: data.profile.name,
      weekly_ride_goal: data.profile.weeklyRideGoal,
      distance_unit: data.profile.distanceUnit,
      member_since: data.profile.memberSince,
      equipped_badge_id: data.profile.equippedBadgeId ?? null,
      active_sport: data.profile.activeSport ?? 'cycling',
      updated_at: new Date().toISOString(),
    }),

    allRides.length > 0
      ? supabase.from('rides').upsert(
          allRides.map((r) => ({
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
            sport: r.sport,
            mood: r.mood ?? null,
          }))
        )
      : Promise.resolve(),

    supabase.from('user_data').upsert({
      user_id: userId,
      achievements: data.cycling.achievements,
      challenges: data.cycling.challenges,
      unlocked_badges: data.cycling.unlockedBadges,
      cycling_xp: data.cycling.xp ?? 0,
      cycling_total_xp_earned: data.cycling.totalXpEarned ?? 0,
      cycling_garage: data.cycling.garage ?? null,
      notifications: data.notifications,
      has_seen_onboarding: data.hasSeenOnboarding,
      running_achievements: data.running.achievements,
      running_challenges: data.running.challenges,
      running_unlocked_badges: data.running.unlockedBadges,
      running_xp: data.running.xp ?? 0,
      running_total_xp_earned: data.running.totalXpEarned ?? 0,
      running_garage: data.running.garage ?? null,
      updated_at: new Date().toISOString(),
    }),
  ]);
  console.log(`[PERF] pushToSupabase (${allRides.length} rides): ${(performance.now() - tPush).toFixed(1)}ms`);
}

// ─── Pull ─────────────────────────────────────────────────────────────────────
// Fetches all user data from Supabase and merges with local state.
// Strategy: Supabase wins for profile/settings; rides are unioned (both local
// and remote are kept, deduplicated by ID).

export async function pullFromSupabase(
  userId: string,
  localData: AppData,
): Promise<AppData> {
  const tPull = performance.now();
  const [profileRes, ridesRes, userDataRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('rides').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('user_data').select('*').eq('user_id', userId).single(),
  ]);
  console.log(`[PERF] pullFromSupabase (3 queries parallel, ${ridesRes.data?.length ?? 0} rides): ${(performance.now() - tPull).toFixed(1)}ms`);

  // If either critical table is missing, return local data unchanged
  if (profileRes.error || userDataRes.error) return localData;

  const p  = profileRes.data;
  const ud = userDataRes.data;

  // Build local ride maps so we can preserve fields not stored in Supabase
  const localCyclingMap = new Map(localData.cycling.rides.map((r) => [r.id, r]));
  const localRunningMap = new Map(localData.running.rides.map((r) => [r.id, r]));

  const allRemoteRows = ridesRes.data ?? [];

  function rowToRide(r: any, localMap: Map<string, Ride>): Ride {
    const local = localMap.get(r.id);
    return {
      id: r.id,
      date: r.date,
      duration: r.duration,
      distance: r.distance ?? undefined,
      isEstimatedDistance: local?.isEstimatedDistance, // not a Supabase column — preserve from local
      calories: r.calories ?? undefined,
      resistance: r.resistance ?? undefined,
      avgHeartRate: r.avg_heart_rate ?? undefined,
      instructor: r.instructor ?? undefined,
      notes: r.notes ?? undefined,
      mood: r.mood != null ? (r.mood as 1 | 2 | 3 | 4 | 5) : undefined,
    };
  }

  const remoteCyclingRides: Ride[] = allRemoteRows
    .filter((r: any) => !r.sport || r.sport === 'cycling')
    .map((r: any) => rowToRide(r, localCyclingMap));
  const remoteRunningRides: Ride[] = allRemoteRows
    .filter((r: any) => r.sport === 'running')
    .map((r: any) => rowToRide(r, localRunningMap));

  // Union: remote + local-only (not yet on server)
  function mergeRides(remote: Ride[], local: Ride[]): Ride[] {
    const remoteIds = new Set(remote.map((r) => r.id));
    return [
      ...remote,
      ...local.filter((r) => !remoteIds.has(r.id)),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const cyclingRides = mergeRides(remoteCyclingRides, localData.cycling.rides);
  const runningRides = mergeRides(remoteRunningRides, localData.running.rides);

  const activeSport: 'cycling' | 'running' =
    (p.active_sport as 'cycling' | 'running') ?? localData.profile.activeSport ?? 'cycling';

  return {
    cycling: {
      rides: cyclingRides,
      achievements:   ud.achievements      ?? localData.cycling.achievements,
      challenges:     ud.challenges        ?? localData.cycling.challenges,
      unlockedBadges: ud.unlocked_badges   ?? localData.cycling.unlockedBadges,
      xp:             ud.cycling_xp        ?? localData.cycling.xp ?? 0,
      totalXpEarned:  ud.cycling_total_xp_earned ?? localData.cycling.totalXpEarned ?? 0,
      garage:         ud.cycling_garage    ?? localData.cycling.garage,
      lastSyncDate: localData.cycling.lastSyncDate,
      lastNudge: localData.cycling.lastNudge,
      lastRideRecap: localData.cycling.lastRideRecap,
      lastWeeklyReflection: localData.cycling.lastWeeklyReflection,
      lastMonthlyReflection: localData.cycling.lastMonthlyReflection,
    },
    running: {
      rides: runningRides,
      achievements:   ud.running_achievements      ?? localData.running.achievements,
      challenges:     ud.running_challenges        ?? localData.running.challenges,
      unlockedBadges: ud.running_unlocked_badges   ?? localData.running.unlockedBadges,
      xp:             ud.running_xp        ?? localData.running.xp ?? 0,
      totalXpEarned:  ud.running_total_xp_earned ?? localData.running.totalXpEarned ?? 0,
      garage:         ud.running_garage    ?? localData.running.garage,
      lastSyncDate: localData.running.lastSyncDate,
      lastNudge: localData.running.lastNudge,
      lastRideRecap: localData.running.lastRideRecap,
      lastWeeklyReflection: localData.running.lastWeeklyReflection,
      lastMonthlyReflection: localData.running.lastMonthlyReflection,
    },
    profile: {
      name: p.name,
      weeklyRideGoal: p.weekly_ride_goal,
      distanceUnit: p.distance_unit as 'km' | 'miles',
      memberSince: p.member_since,
      equippedBadgeId: p.equipped_badge_id ?? undefined,
      indoorCyclingSpeed: localData.profile.indoorCyclingSpeed, // not a Supabase column — preserve from local
      activeSport,
    },
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

// ─── Account deletion ─────────────────────────────────────────────────────────
// Calls the delete_user_account() stored procedure which deletes the auth.users
// row — cascading to profiles, rides, and user_data via ON DELETE CASCADE.

export async function deleteAccountRemote(): Promise<void> {
  const { error } = await supabase.rpc('delete_user_account');
  if (error) throw error;
}
