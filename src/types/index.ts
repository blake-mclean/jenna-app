export interface Ride {
  id: string;
  date: string; // ISO string
  duration: number; // minutes
  distance?: number; // km
  calories?: number;
  resistance?: number; // 1–10
  avgHeartRate?: number;
  notes?: string;
  instructor?: string;
}

export interface UserProfile {
  name: string;
  weeklyRideGoal: number;
  distanceUnit: 'km' | 'miles';
  memberSince: string; // ISO date
  equippedBadgeId?: string;
}

export interface AchievementState {
  id: string;
  earned: boolean;
  earnedDate?: string;
}

export interface ChallengeState {
  id: string;
  enrolled: boolean;
  enrolledDate?: string;
  progress: number;
  completed: boolean;
  completedDate?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyReminderHour: number; // 0–23
  dailyReminderMinute: number;
  streakCelebrations: boolean;
}

export interface AppData {
  rides: Ride[];
  profile: UserProfile;
  achievements: AchievementState[];
  challenges: ChallengeState[];
  notifications: NotificationSettings;
  unlockedBadges: string[];
  hasSeenOnboarding: boolean;
}

// ─── Static definitions ────────────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (rides: Ride[], streak: number) => boolean;
}

export type ChallengeType = 'rides' | 'duration' | 'distance' | 'streak' | 'calories';

export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: ChallengeType;
  target: number; // rides | minutes | km | days
  durationDays?: number; // rolling window
}
