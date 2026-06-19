import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { AppData, SportBucket, Ride, UserProfile, ChallengeState, NotificationSettings, AiInsight, GaragePartId } from '../types';
import { loadAppData, saveAppData } from '../utils/storage';
import { evaluateAchievements } from '../utils/achievements';
import { evaluateChallenges } from '../utils/challenges';
import { ACHIEVEMENT_DEFS } from '../constants/achievements';
import { RUNNING_ACHIEVEMENT_DEFS } from '../constants/runningAchievements';
import { CHALLENGE_DEFS } from '../constants/challenges';
import { RUNNING_CHALLENGE_DEFS } from '../constants/runningChallenges';
import { getLevelInfo } from '../utils/levels';
import { LEVEL_BADGE_DEFS } from '../constants/levelBadges';
import { GARAGE_PARTS, EMPTY_GARAGE, getXpMultiplier } from '../constants/garage';
import { xpForRide, xpForChallenge, xpForLevelUp, XP_PER_ACHIEVEMENT } from '../utils/xp';
import { supabase } from '../lib/supabase';
import { pushToSupabase, pullFromSupabase, deleteRideRemote, resetUserDataRemote } from '../utils/sync';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeUnlockedBadges(totalMiles: number, existing: string[]): string[] {
  const { level } = getLevelInfo(totalMiles);
  const earned = LEVEL_BADGE_DEFS.filter((b) => b.unlocksAtLevel <= level).map((b) => b.id);
  const merged = [...existing];
  for (const id of earned) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

function totalMilesFromRides(rides: Ride[]): number {
  return rides.reduce((s, r) => s + (r.distance ?? 0), 0) * 0.621371;
}

function getSport(state: AppData): 'cycling' | 'running' {
  return state.profile.activeSport ?? 'cycling';
}

function getBucket(state: AppData): SportBucket {
  return state[getSport(state)];
}

function getAchievementDefs(sport: 'cycling' | 'running') {
  return sport === 'running' ? RUNNING_ACHIEVEMENT_DEFS : ACHIEVEMENT_DEFS;
}

function getChallengeDefs(sport: 'cycling' | 'running') {
  return sport === 'running' ? RUNNING_CHALLENGE_DEFS : CHALLENGE_DEFS;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD'; payload: AppData }
  | { type: 'ADD_RIDE'; payload: Ride }
  | { type: 'DELETE_RIDE'; payload: string }
  | { type: 'UPDATE_RIDE'; payload: { id: string; patch: Partial<Ride> } }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ENROLL_CHALLENGE'; payload: string }
  | { type: 'UNENROLL_CHALLENGE'; payload: string }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: Partial<NotificationSettings> }
  | { type: 'EQUIP_BADGE'; payload: string | undefined }
  | { type: 'MARK_ONBOARDING_SEEN' }
  | { type: 'RESET_DATA' }
  | { type: 'IMPORT_RIDES'; payload: Ride[] }
  | { type: 'SET_HEALTH_SYNC_DATE'; payload: string }
  | { type: 'SWITCH_SPORT'; payload: 'cycling' | 'running' }
  | { type: 'SET_AI_INSIGHT'; payload: { kind: 'nudge' | 'rideRecap' | 'weeklyReflection' | 'monthlyReflection'; insight: AiInsight } }
  | { type: 'CLEAR_AI_INSIGHT'; payload: 'nudge' | 'rideRecap' | 'weeklyReflection' | 'monthlyReflection' }
  | { type: 'PURCHASE_UPGRADE'; payload: { partId: GaragePartId; tier: number } }
  | { type: 'EQUIP_UPGRADE'; payload: { partId: GaragePartId; tier: number } };

const EMPTY_BUCKET: SportBucket = {
  rides: [],
  achievements: [],
  challenges: [],
  unlockedBadges: [],
  xp: 0,
  totalXpEarned: 0,
  garage: { ...EMPTY_GARAGE, owned: { ...EMPTY_GARAGE.owned }, equipped: { ...EMPTY_GARAGE.equipped } },
};

const INITIAL: AppData = {
  cycling: { ...EMPTY_BUCKET },
  running: { ...EMPTY_BUCKET },
  profile: {
    name: 'Cyclist',
    weeklyRideGoal: 4,
    distanceUnit: 'km',
    memberSince: new Date().toISOString(),
    activeSport: 'cycling',
  },
  notifications: {
    enabled: false,
    dailyReminderHour: 8,
    dailyReminderMinute: 0,
    streakCelebrations: true,
  },
  hasSeenOnboarding: false,
};

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'LOAD': {
      const cycling = action.payload.cycling;
      const running = action.payload.running;
      const cyclingBadges = computeUnlockedBadges(totalMilesFromRides(cycling.rides), cycling.unlockedBadges ?? []);
      const runningBadges = computeUnlockedBadges(totalMilesFromRides(running.rides), running.unlockedBadges ?? []);
      return {
        ...action.payload,
        cycling: { ...cycling, unlockedBadges: cyclingBadges },
        running: { ...running, unlockedBadges: runningBadges },
      };
    }

    case 'ADD_RIDE': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const rides = [action.payload, ...bucket.rides];
      const { updated: achievements, newlyEarned } = evaluateAchievements(rides, bucket.achievements, getAchievementDefs(sport));
      const challenges = evaluateChallenges(rides, bucket.challenges, getChallengeDefs(sport));
      const unlockedBadges = computeUnlockedBadges(totalMilesFromRides(rides), bucket.unlockedBadges);

      // ── XP calculation ──────────────────────────────────────────────────
      const multiplier = getXpMultiplier(bucket.garage ?? EMPTY_GARAGE);
      const oldLevel = getLevelInfo(totalMilesFromRides(bucket.rides)).level;
      const newLevel = getLevelInfo(totalMilesFromRides(rides)).level;
      let rawXp = xpForRide(action.payload);
      rawXp += newlyEarned.length * XP_PER_ACHIEVEMENT;
      const defs = getChallengeDefs(sport);
      for (const cs of challenges) {
        if (cs.completed && !bucket.challenges.find((c) => c.id === cs.id)?.completed) {
          const def = defs.find((d) => d.id === cs.id);
          if (def) rawXp += xpForChallenge(def.target);
        }
      }
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) rawXp += xpForLevelUp(lvl);
      const xpGained = Math.round(rawXp * multiplier);

      return {
        ...state,
        [sport]: {
          ...bucket,
          rides, achievements, challenges, unlockedBadges,
          xp: (bucket.xp ?? 0) + xpGained,
          totalXpEarned: (bucket.totalXpEarned ?? 0) + xpGained,
        },
      };
    }

    case 'DELETE_RIDE': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const rides = bucket.rides.filter((r) => r.id !== action.payload);
      const challenges = evaluateChallenges(rides, bucket.challenges, getChallengeDefs(sport));
      return { ...state, [sport]: { ...bucket, rides, challenges } };
    }

    case 'UPDATE_RIDE': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const rides = bucket.rides.map((r) =>
        r.id === action.payload.id ? { ...r, ...action.payload.patch } : r
      );
      const { updated: achievements } = evaluateAchievements(rides, bucket.achievements, getAchievementDefs(sport));
      const challenges = evaluateChallenges(rides, bucket.challenges, getChallengeDefs(sport));
      const unlockedBadges = computeUnlockedBadges(totalMilesFromRides(rides), bucket.unlockedBadges);
      return { ...state, [sport]: { ...bucket, rides, achievements, challenges, unlockedBadges } };
    }

    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };

    case 'ENROLL_CHALLENGE': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const already = bucket.challenges.find((c) => c.id === action.payload);
      if (already) return state;
      const newState: ChallengeState = {
        id: action.payload,
        enrolled: true,
        enrolledDate: new Date().toISOString(),
        progress: 0,
        completed: false,
      };
      const challenges = evaluateChallenges(bucket.rides, [...bucket.challenges, newState], getChallengeDefs(sport));
      return { ...state, [sport]: { ...bucket, challenges } };
    }

    case 'UNENROLL_CHALLENGE': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      return { ...state, [sport]: { ...bucket, challenges: bucket.challenges.filter((c) => c.id !== action.payload) } };
    }

    case 'UPDATE_NOTIFICATIONS':
      return { ...state, notifications: { ...state.notifications, ...action.payload } };

    case 'EQUIP_BADGE':
      return { ...state, profile: { ...state.profile, equippedBadgeId: action.payload } };

    case 'MARK_ONBOARDING_SEEN':
      return { ...state, hasSeenOnboarding: true };

    case 'SET_HEALTH_SYNC_DATE': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      return { ...state, [sport]: { ...bucket, lastSyncDate: action.payload } };
    }

    case 'IMPORT_RIDES': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const existingIds = new Set(bucket.rides.map((r) => r.id));
      const newRides = action.payload.filter((r) => !existingIds.has(r.id));
      if (newRides.length === 0) return state;
      const rides = [...newRides, ...bucket.rides];
      const { updated: achievements, newlyEarned } = evaluateAchievements(rides, bucket.achievements, getAchievementDefs(sport));
      const challenges = evaluateChallenges(rides, bucket.challenges, getChallengeDefs(sport));
      const unlockedBadges = computeUnlockedBadges(totalMilesFromRides(rides), bucket.unlockedBadges);
      const multiplier = getXpMultiplier(bucket.garage ?? EMPTY_GARAGE);
      const oldLevel = getLevelInfo(totalMilesFromRides(bucket.rides)).level;
      const newLevel = getLevelInfo(totalMilesFromRides(rides)).level;
      const defs = getChallengeDefs(sport);
      let rawXp = newRides.reduce((s, r) => s + xpForRide(r), 0);
      rawXp += newlyEarned.length * XP_PER_ACHIEVEMENT;
      for (const cs of challenges) {
        if (cs.completed && !bucket.challenges.find((c) => c.id === cs.id)?.completed) {
          const def = defs.find((d) => d.id === cs.id);
          if (def) rawXp += xpForChallenge(def.target);
        }
      }
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) rawXp += xpForLevelUp(lvl);
      const xpGained = Math.round(rawXp * multiplier);
      return {
        ...state,
        [sport]: {
          ...bucket, rides, achievements, challenges, unlockedBadges,
          xp: (bucket.xp ?? 0) + xpGained,
          totalXpEarned: (bucket.totalXpEarned ?? 0) + xpGained,
        },
      };
    }

    case 'PURCHASE_UPGRADE': {
      const { partId, tier } = action.payload;
      const sport = getSport(state);
      const bucket = getBucket(state);
      const garage = bucket.garage ?? EMPTY_GARAGE;
      const partDef = GARAGE_PARTS.find((p) => p.id === partId);
      const tierDef = partDef?.tiers[tier];
      if (!tierDef || tierDef.cost > (bucket.xp ?? 0)) return state;
      return {
        ...state,
        [sport]: {
          ...bucket,
          xp: (bucket.xp ?? 0) - tierDef.cost,
          garage: {
            ...garage,
            owned:    { ...garage.owned,    [partId]: tier },
            equipped: { ...garage.equipped, [partId]: tier },
          },
        },
      };
    }

    case 'EQUIP_UPGRADE': {
      const { partId, tier } = action.payload;
      const sport = getSport(state);
      const bucket = getBucket(state);
      const garage = bucket.garage ?? EMPTY_GARAGE;
      if (tier > (garage.owned[partId] ?? 0)) return state;
      return {
        ...state,
        [sport]: {
          ...bucket,
          garage: { ...garage, equipped: { ...garage.equipped, [partId]: tier } },
        },
      };
    }

    case 'SWITCH_SPORT':
      return { ...state, profile: { ...state.profile, activeSport: action.payload } };

    case 'SET_AI_INSIGHT': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const kindToKey = {
        nudge: 'lastNudge',
        rideRecap: 'lastRideRecap',
        weeklyReflection: 'lastWeeklyReflection',
        monthlyReflection: 'lastMonthlyReflection',
      } as const;
      const key = kindToKey[action.payload.kind];
      return { ...state, [sport]: { ...bucket, [key]: action.payload.insight } };
    }

    case 'CLEAR_AI_INSIGHT': {
      const sport = getSport(state);
      const bucket = getBucket(state);
      const clearKindToKey = {
        nudge: 'lastNudge',
        rideRecap: 'lastRideRecap',
        weeklyReflection: 'lastWeeklyReflection',
        monthlyReflection: 'lastMonthlyReflection',
      } as const;
      const key = clearKindToKey[action.payload];
      return { ...state, [sport]: { ...bucket, [key]: undefined } };
    }

    case 'RESET_DATA':
      return {
        ...INITIAL,
        profile: { ...state.profile, activeSport: state.profile.activeSport },
        hasSeenOnboarding: true,
      };

    default:
      return state;
  }
}

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AddRideResult {
  newAchievements: string[];
  completedChallenges: string[];
}

interface AppContextValue {
  data: AppData;
  sportData: SportBucket;
  loaded: boolean;
  session: Session | null;
  // Data actions
  addRide: (ride: Omit<Ride, 'id' | 'date'>) => Promise<AddRideResult>;
  addRideOnDate: (ride: Omit<Ride, 'id'> & { date: string }) => Promise<AddRideResult>;
  importRides: (rides: Ride[]) => AddRideResult;
  deleteRide: (id: string) => void;
  updateRide: (id: string, patch: Partial<Ride>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  enrollChallenge: (id: string) => void;
  unenrollChallenge: (id: string) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  equipBadge: (id: string | undefined) => void;
  markOnboardingSeen: () => void;
  resetData: () => void;
  setLastHealthSyncDate: (date: string) => void;
  switchSport: (sport: 'cycling' | 'running') => void;
  setAiInsight: (kind: 'nudge' | 'rideRecap' | 'weeklyReflection' | 'monthlyReflection', insight: AiInsight) => void;
  clearAiInsight: (kind: 'nudge' | 'rideRecap' | 'weeklyReflection' | 'monthlyReflection') => void;
  purchaseUpgrade: (partId: GaragePartId, tier: number) => void;
  equipUpgrade: (partId: GaragePartId, tier: number) => void;
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ emailConfirmationRequired: boolean }>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, INITIAL);
  const [loaded, setLoaded]   = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);

  // Refs that survive renders without causing re-renders
  const sessionRef      = useRef<Session | null>(null);
  const skipSyncCount   = useRef(0); // incremented before each Supabase-sourced LOAD
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Keep sessionRef in sync
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ── Initialise: load cache → subscribe to auth → pull from Supabase ─────────
  useEffect(() => {
    (async () => {
      const t0 = performance.now();

      // 1. Load local cache immediately so the UI has data right away
      const localData = await loadAppData();
      console.log(`[PERF] AsyncStorage load: ${(performance.now() - t0).toFixed(1)}ms`);
      skipSyncCount.current++;
      dispatch({ type: 'LOAD', payload: localData });
      setLoaded(true);
      console.log(`[PERF] First render ready: ${(performance.now() - t0).toFixed(1)}ms`);

      // 2. Subscribe to auth state. INITIAL_SESSION fires immediately with
      //    the persisted session (or null). SIGNED_IN fires on explicit login.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log(`[PERF] onAuthStateChange (${event}): ${(performance.now() - t0).toFixed(1)}ms`);
          setSession(newSession);
          sessionRef.current = newSession;

          if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            // Pull remote → merge → migrate any local-only data up
            const tSync = performance.now();
            try {
              const current = await loadAppData();
              const merged  = await pullFromSupabase(newSession.user.id, current);
              console.log(`[PERF] Supabase pull done: ${(performance.now() - tSync).toFixed(1)}ms`);
              await pushToSupabase(newSession.user.id, merged); // migrate local → remote
              console.log(`[PERF] Supabase push done: ${(performance.now() - tSync).toFixed(1)}ms | total from launch: ${(performance.now() - t0).toFixed(1)}ms`);
              skipSyncCount.current++;
              dispatch({ type: 'LOAD', payload: merged });
              await saveAppData(merged);
              console.log(`[PERF] Full sync complete: ${(performance.now() - t0).toFixed(1)}ms`);
            } catch (_) { /* offline — stay on cache */ }
          } else if (event === 'SIGNED_OUT') {
            skipSyncCount.current++;
            dispatch({ type: 'LOAD', payload: INITIAL });
            await saveAppData(INITIAL);
          }
        }
      );
      subscriptionRef.current = subscription;
    })();

    return () => subscriptionRef.current?.unsubscribe();
  }, []);

  // ── Persist every state change to AsyncStorage; sync to Supabase for user
  //    actions (not for Supabase-sourced LOADs, tracked via skipSyncCount) ─────
  useEffect(() => {
    if (!loaded) return;

    if (skipSyncCount.current > 0) {
      skipSyncCount.current--;
      saveAppData(data); // always keep the local cache fresh
      return;
    }

    saveAppData(data);

    const userId = sessionRef.current?.user?.id;
    if (userId) {
      pushToSupabase(userId, data).catch(() => {}); // fire-and-forget
    }
  }, [data, loaded]);

  // ── Active sport bucket (computed) ─────────────────────────────────────────
  const activeSport = data.profile.activeSport ?? 'cycling';
  const sportData: SportBucket = data[activeSport];

  // ── Shared ride-result builder ─────────────────────────────────────────────
  async function buildRideResult(ride: Ride): Promise<AddRideResult> {
    const bucket = data[activeSport];
    const newRides = [ride, ...bucket.rides];
    const { newlyEarned: newAchievements } = evaluateAchievements(newRides, bucket.achievements, getAchievementDefs(activeSport));
    const updatedChallenges = evaluateChallenges(newRides, bucket.challenges, getChallengeDefs(activeSport));
    const completedChallenges = updatedChallenges
      .filter((c) => c.completed && !bucket.challenges.find((old) => old.id === c.id)?.completed)
      .map((c) => c.id);
    dispatch({ type: 'ADD_RIDE', payload: ride });
    return { newAchievements, completedChallenges };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const addRide = useCallback(
    (partial: Omit<Ride, 'id' | 'date'>) =>
      buildRideResult({ ...partial, id: Date.now().toString(), date: new Date().toISOString() }),
    [data, activeSport],
  );

  const addRideOnDate = useCallback(
    (partial: Omit<Ride, 'id'> & { date: string }) =>
      buildRideResult({ ...partial, id: Date.now().toString() + Math.random() }),
    [data, activeSport],
  );

  const importRides = useCallback((rides: Ride[]): AddRideResult => {
    const bucket = data[activeSport];
    const existingIds = new Set(bucket.rides.map((r) => r.id));
    const newRides = rides.filter((r) => !existingIds.has(r.id));
    const allRides = [...newRides, ...bucket.rides];
    const { newlyEarned: newAchievements } = evaluateAchievements(allRides, bucket.achievements, getAchievementDefs(activeSport));
    const updatedChallenges = evaluateChallenges(allRides, bucket.challenges, getChallengeDefs(activeSport));
    const completedChallenges = updatedChallenges
      .filter((c) => c.completed && !bucket.challenges.find((old) => old.id === c.id)?.completed)
      .map((c) => c.id);
    dispatch({ type: 'IMPORT_RIDES', payload: rides });
    return { newAchievements, completedChallenges };
  }, [data, activeSport]);

  const deleteRide = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RIDE', payload: id });
    const userId = sessionRef.current?.user?.id;
    if (userId) deleteRideRemote(userId, id).catch(() => {});
  }, []);

  const updateRide = useCallback(
    (id: string, patch: Partial<Ride>) => dispatch({ type: 'UPDATE_RIDE', payload: { id, patch } }),
    [],
  );

  const updateProfile     = useCallback((p: Partial<UserProfile>) => dispatch({ type: 'UPDATE_PROFILE', payload: p }), []);
  const enrollChallenge   = useCallback((id: string) => dispatch({ type: 'ENROLL_CHALLENGE', payload: id }), []);
  const unenrollChallenge = useCallback((id: string) => dispatch({ type: 'UNENROLL_CHALLENGE', payload: id }), []);
  const updateNotifications = useCallback((p: Partial<NotificationSettings>) => dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: p }), []);
  const equipBadge        = useCallback((id: string | undefined) => dispatch({ type: 'EQUIP_BADGE', payload: id }), []);
  const markOnboardingSeen = useCallback(() => dispatch({ type: 'MARK_ONBOARDING_SEEN' }), []);
  const setLastHealthSyncDate = useCallback(
    (date: string) => dispatch({ type: 'SET_HEALTH_SYNC_DATE', payload: date }),
    [],
  );
  const switchSport = useCallback(
    (sport: 'cycling' | 'running') => dispatch({ type: 'SWITCH_SPORT', payload: sport }),
    [],
  );
  const setAiInsight = useCallback(
    (kind: 'nudge' | 'rideRecap' | 'weeklyReflection' | 'monthlyReflection', insight: AiInsight) =>
      dispatch({ type: 'SET_AI_INSIGHT', payload: { kind, insight } }),
    [],
  );
  const clearAiInsight = useCallback(
    (kind: 'nudge' | 'rideRecap' | 'weeklyReflection' | 'monthlyReflection') => dispatch({ type: 'CLEAR_AI_INSIGHT', payload: kind }),
    [],
  );
  const purchaseUpgrade = useCallback(
    (partId: GaragePartId, tier: number) => dispatch({ type: 'PURCHASE_UPGRADE', payload: { partId, tier } }),
    [],
  );
  const equipUpgrade = useCallback(
    (partId: GaragePartId, tier: number) => dispatch({ type: 'EQUIP_UPGRADE', payload: { partId, tier } }),
    [],
  );

  const resetData = useCallback(() => {
    const userId = sessionRef.current?.user?.id;
    dispatch({ type: 'RESET_DATA' });
    if (userId) {
      const emptyState: AppData = {
        ...INITIAL,
        profile: { ...data.profile, activeSport: data.profile.activeSport },
        hasSeenOnboarding: true,
      };
      resetUserDataRemote(userId, emptyState).catch(() => {});
    }
  }, [data.profile]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange handles the rest
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { emailConfirmationRequired: !authData.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // onAuthStateChange handles clearing data
  }, []);

  return (
    <AppContext.Provider
      value={{
        data, sportData, loaded, session,
        addRide, addRideOnDate, importRides, deleteRide, updateRide, updateProfile,
        enrollChallenge, unenrollChallenge, updateNotifications,
        equipBadge, markOnboardingSeen, resetData, setLastHealthSyncDate, switchSport,
        setAiInsight, clearAiInsight, purchaseUpgrade, equipUpgrade,
        signIn, signUp, signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
