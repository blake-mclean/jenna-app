import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, NotificationSettings, UserProfile } from '../types';

const KEY = 'jenna_app_data';

const DEFAULT_DATA: AppData = {
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

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_DATA;
  const parsed = JSON.parse(raw) as Partial<AppData>;
  return { ...DEFAULT_DATA, ...parsed };
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
