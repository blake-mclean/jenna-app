import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, SportBucket } from '../types';
import { EMPTY_GARAGE } from '../constants/garage';

const KEY = 'jenna_app_data';

const EMPTY_BUCKET: SportBucket = {
  rides: [],
  achievements: [],
  challenges: [],
  unlockedBadges: [],
  xp: 0,
  totalXpEarned: 0,
  garage: { owned: { ...EMPTY_GARAGE.owned }, equipped: { ...EMPTY_GARAGE.equipped } },
};

const DEFAULT_DATA: AppData = {
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

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_DATA;

  const parsed = JSON.parse(raw) as any;

  // ── Migration: old flat format (has top-level `rides` array) → sport buckets
  if (Array.isArray(parsed.rides)) {
    parsed.cycling = {
      rides: parsed.rides ?? [],
      achievements: parsed.achievements ?? [],
      challenges: parsed.challenges ?? [],
      unlockedBadges: parsed.unlockedBadges ?? [],
      lastSyncDate: parsed.lastHealthSyncDate,
    };
    parsed.running = { ...EMPTY_BUCKET };
    delete parsed.rides;
    delete parsed.achievements;
    delete parsed.challenges;
    delete parsed.unlockedBadges;
    delete parsed.lastHealthSyncDate;
  }

  // Ensure both buckets exist (handles partial migrations)
  if (!parsed.cycling) parsed.cycling = { ...EMPTY_BUCKET };
  if (!parsed.running) parsed.running = { ...EMPTY_BUCKET };

  // Migration: add xp/garage fields if missing
  for (const key of ['cycling', 'running'] as const) {
    if (parsed[key].xp == null)           parsed[key].xp = 0;
    if (parsed[key].totalXpEarned == null) parsed[key].totalXpEarned = 0;
    if (!parsed[key].garage) {
      parsed[key].garage = { owned: { ...EMPTY_GARAGE.owned }, equipped: { ...EMPTY_GARAGE.equipped } };
    } else {
      if (!parsed[key].garage.owned)    parsed[key].garage.owned    = { ...EMPTY_GARAGE.owned };
      if (!parsed[key].garage.equipped) parsed[key].garage.equipped = { ...EMPTY_GARAGE.equipped };
    }
  }

  return { ...DEFAULT_DATA, ...parsed } as AppData;
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
