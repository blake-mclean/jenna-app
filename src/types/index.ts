export interface Ride {
  id: string;
  date: string; // ISO string
  duration: number; // minutes
  distance?: number; // km
  isEstimatedDistance?: boolean; // true when distance was calculated, not recorded by GPS
  calories?: number;
  resistance?: number; // 1–10
  avgHeartRate?: number;
  notes?: string;
  instructor?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
}

export interface UserProfile {
  name: string;
  weeklyRideGoal: number;
  distanceUnit: 'km' | 'miles';
  memberSince: string; // ISO date
  equippedBadgeId?: string;
  indoorCyclingSpeed?: number; // km/h used to estimate distance for indoor rides (default 20)
  activeSport?: 'cycling' | 'running'; // default 'cycling'
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

// ─── AI insights ──────────────────────────────────────────────────────────────

export interface AiInsight {
  content: string;
  createdAt: string; // ISO
}

// ─── Garage ────────────────────────────────────────────────────────────────────

export type GaragePartId = 'frame' | 'wheels' | 'handlebars' | 'drivetrain';

export interface GarageState {
  owned:    Record<GaragePartId, number>; // highest tier purchased per part (0 = nothing bought)
  equipped: Record<GaragePartId, number>; // tier currently shown on the bike (0 = default)
}

// ─── Sport bucket ──────────────────────────────────────────────────────────────

export interface SportBucket {
  rides: Ride[];
  achievements: AchievementState[];
  challenges: ChallengeState[];
  unlockedBadges: string[];
  xp: number;              // current spendable XP
  totalXpEarned: number;   // lifetime XP (never decreases)
  garage: GarageState;
  lastSyncDate?: string;   // ISO — device-specific Apple Health sync date
  lastNudge?: AiInsight;
  lastRideRecap?: AiInsight;
  lastWeeklyReflection?: AiInsight;
  lastMonthlyReflection?: AiInsight;
}

export interface AppData {
  cycling: SportBucket;
  running: SportBucket;
  profile: UserProfile;
  notifications: NotificationSettings;
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
