import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { AppData, Ride, UserProfile, ChallengeState, NotificationSettings } from '../types';
import { loadAppData, saveAppData } from '../utils/storage';
import { evaluateAchievements } from '../utils/achievements';
import { evaluateChallenges } from '../utils/challenges';
import { getLevelInfo } from '../utils/levels';
import { LEVEL_BADGE_DEFS } from '../constants/levelBadges';
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

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD'; payload: AppData }
  | { type: 'ADD_RIDE'; payload: Ride }
  | { type: 'DELETE_RIDE'; payload: string }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ENROLL_CHALLENGE'; payload: string }
  | { type: 'UNENROLL_CHALLENGE'; payload: string }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: Partial<NotificationSettings> }
  | { type: 'EQUIP_BADGE'; payload: string | undefined }
  | { type: 'MARK_ONBOARDING_SEEN' }
  | { type: 'RESET_DATA' };

const INITIAL: AppData = {
  rides: [],
  profile: {
    name: 'Cyclist',
    weeklyRideGoal: 4,
    distanceUnit: 'km',
    memberSince: new Date().toISOString(),
  },
  achievements: [],
  challenges: [],
  notifications: {
    enabled: false,
    dailyReminderHour: 8,
    dailyReminderMinute: 0,
    streakCelebrations: true,
  },
  unlockedBadges: [],
  hasSeenOnboarding: false,
};

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'LOAD': {
      const miles = totalMilesFromRides(action.payload.rides);
      const unlockedBadges = computeUnlockedBadges(miles, action.payload.unlockedBadges ?? []);
      return { ...action.payload, unlockedBadges };
    }

    case 'ADD_RIDE': {
      const rides = [action.payload, ...state.rides];
      const { updated: achievements } = evaluateAchievements(rides, state.achievements);
      const challenges = evaluateChallenges(rides, state.challenges);
      const unlockedBadges = computeUnlockedBadges(totalMilesFromRides(rides), state.unlockedBadges);
      return { ...state, rides, achievements, challenges, unlockedBadges };
    }

    case 'DELETE_RIDE': {
      const rides = state.rides.filter((r) => r.id !== action.payload);
      const challenges = evaluateChallenges(rides, state.challenges);
      return { ...state, rides, challenges };
    }

    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };

    case 'ENROLL_CHALLENGE': {
      const already = state.challenges.find((c) => c.id === action.payload);
      if (already) return state;
      const newState: ChallengeState = {
        id: action.payload,
        enrolled: true,
        enrolledDate: new Date().toISOString(),
        progress: 0,
        completed: false,
      };
      const challenges = evaluateChallenges(state.rides, [...state.challenges, newState]);
      return { ...state, challenges };
    }

    case 'UNENROLL_CHALLENGE':
      return { ...state, challenges: state.challenges.filter((c) => c.id !== action.payload) };

    case 'UPDATE_NOTIFICATIONS':
      return { ...state, notifications: { ...state.notifications, ...action.payload } };

    case 'EQUIP_BADGE':
      return { ...state, profile: { ...state.profile, equippedBadgeId: action.payload } };

    case 'MARK_ONBOARDING_SEEN':
      return { ...state, hasSeenOnboarding: true };

    case 'RESET_DATA':
      return { ...INITIAL, profile: { ...state.profile }, hasSeenOnboarding: true };

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
  loaded: boolean;
  session: Session | null;
  // Data actions
  addRide: (ride: Omit<Ride, 'id' | 'date'>) => Promise<AddRideResult>;
  addRideOnDate: (ride: Omit<Ride, 'id'> & { date: string }) => Promise<AddRideResult>;
  deleteRide: (id: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  enrollChallenge: (id: string) => void;
  unenrollChallenge: (id: string) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  equipBadge: (id: string | undefined) => void;
  markOnboardingSeen: () => void;
  resetData: () => void;
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
      // 1. Load local cache immediately so the UI has data right away
      const localData = await loadAppData();
      skipSyncCount.current++;
      dispatch({ type: 'LOAD', payload: localData });
      setLoaded(true);

      // 2. Subscribe to auth state. INITIAL_SESSION fires immediately with
      //    the persisted session (or null). SIGNED_IN fires on explicit login.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          setSession(newSession);
          sessionRef.current = newSession;

          if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            // Pull remote → merge → migrate any local-only data up
            try {
              const current = await loadAppData();
              const merged  = await pullFromSupabase(newSession.user.id, current);
              await pushToSupabase(newSession.user.id, merged); // migrate local → remote
              skipSyncCount.current++;
              dispatch({ type: 'LOAD', payload: merged });
              await saveAppData(merged);
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

  // ── Shared ride-result builder ─────────────────────────────────────────────
  async function buildRideResult(ride: Ride): Promise<AddRideResult> {
    const newRides = [ride, ...data.rides];
    const { newlyEarned: newAchievements } = evaluateAchievements(newRides, data.achievements);
    const updatedChallenges = evaluateChallenges(newRides, data.challenges);
    const completedChallenges = updatedChallenges
      .filter((c) => c.completed && !data.challenges.find((old) => old.id === c.id)?.completed)
      .map((c) => c.id);
    dispatch({ type: 'ADD_RIDE', payload: ride });
    return { newAchievements, completedChallenges };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const addRide = useCallback(
    (partial: Omit<Ride, 'id' | 'date'>) =>
      buildRideResult({ ...partial, id: Date.now().toString(), date: new Date().toISOString() }),
    [data.rides, data.achievements, data.challenges],
  );

  const addRideOnDate = useCallback(
    (partial: Omit<Ride, 'id'> & { date: string }) =>
      buildRideResult({ ...partial, id: Date.now().toString() + Math.random() }),
    [data.rides, data.achievements, data.challenges],
  );

  const deleteRide = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RIDE', payload: id });
    const userId = sessionRef.current?.user?.id;
    if (userId) deleteRideRemote(userId, id).catch(() => {});
  }, []);

  const updateProfile     = useCallback((p: Partial<UserProfile>) => dispatch({ type: 'UPDATE_PROFILE', payload: p }), []);
  const enrollChallenge   = useCallback((id: string) => dispatch({ type: 'ENROLL_CHALLENGE', payload: id }), []);
  const unenrollChallenge = useCallback((id: string) => dispatch({ type: 'UNENROLL_CHALLENGE', payload: id }), []);
  const updateNotifications = useCallback((p: Partial<NotificationSettings>) => dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: p }), []);
  const equipBadge        = useCallback((id: string | undefined) => dispatch({ type: 'EQUIP_BADGE', payload: id }), []);
  const markOnboardingSeen = useCallback(() => dispatch({ type: 'MARK_ONBOARDING_SEEN' }), []);

  const resetData = useCallback(() => {
    const userId = sessionRef.current?.user?.id;
    dispatch({ type: 'RESET_DATA' });
    if (userId) {
      // RESET_DATA produces new state; we need to delete rides from Supabase
      // explicitly since upsert doesn't remove rows.
      const emptyState: AppData = { ...INITIAL, profile: { ...data.profile }, hasSeenOnboarding: true };
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
        data, loaded, session,
        addRide, addRideOnDate, deleteRide, updateProfile,
        enrollChallenge, unenrollChallenge, updateNotifications,
        equipBadge, markOnboardingSeen, resetData,
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
