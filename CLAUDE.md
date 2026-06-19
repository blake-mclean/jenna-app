# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Read the docs first

**Before writing any code**, read the exact versioned SDK docs at https://docs.expo.dev/versions/v54.0.0/ — APIs shift between SDK versions and the wrong version will silently break things.

## Commands

```bash
npx expo start --port 8083   # Expo Go on physical device via LAN (same WiFi — no --tunnel, ngrok is unreliable)
npm run ios                  # iOS simulator
npm run android              # Android emulator
npx tsc --noEmit             # Type-check (no test suite exists)
npx expo config              # Verify app.json resolves without plugin errors
```

When installing new Expo packages, always use `npx expo install <pkg>` (not `npm install`) so the correct SDK-54-compatible version is resolved. For non-Expo packages, use `npm install --legacy-peer-deps`.

## Opening a new Terminal window to run the app

AppleScript's `do script` drops `cd && ...` when passed directly, so the app must be launched via a temp script:

```bash
printf '#!/bin/zsh\ncd /Users/blakemclean/Documents/ClaudeApps/JENNA_App\nnpx expo start --port 8083\n' > /tmp/launch_jenna.sh && chmod +x /tmp/launch_jenna.sh
```

Then open a new Terminal window running it:

```applescript
osascript -e 'tell application "Terminal"
  activate
  do script "/tmp/launch_jenna.sh"
end tell'
```

## SDK and compatibility constraints

- **Expo SDK 54** — expo-router **~6.0.24**, React 19.1.0, React Native 0.81.5
- `expo-status-bar` v3.x has no config plugin — do not add it to the `plugins` array in `app.json`

## Architecture

### Data shape

`AppData` holds **two independent sport buckets** plus shared profile/settings:

```ts
interface AppData {
  cycling: SportBucket;
  running: SportBucket;
  profile: UserProfile;      // includes activeSport: 'cycling' | 'running'
  notifications: NotificationSettings;
  hasSeenOnboarding: boolean;
}

interface SportBucket {
  rides: Ride[];
  achievements: AchievementState[];
  challenges: ChallengeState[];
  unlockedBadges: string[];
  lastSyncDate?: string;     // device-specific Apple Health sync date
}
```

All reducer actions (ADD_RIDE, DELETE_RIDE, ENROLL_CHALLENGE, etc.) operate on `state[activeSport]` — the currently active bucket. **Cycling and running progress are completely separate.**

### Data flow

All app state lives in `src/context/AppContext.tsx` — a single `useReducer` store. On every state change, two things happen automatically:

1. **AsyncStorage** (`src/utils/storage.ts`) is written synchronously for instant re-launch
2. **Supabase** (`src/utils/sync.ts`) receives a fire-and-forget `pushToSupabase` call if the user is signed in

On app startup the flow is: load AsyncStorage immediately → render → `onAuthStateChange` fires → `pullFromSupabase` merges remote data → dispatch `LOAD` again. The `skipSyncCount` ref prevents the Supabase-sourced LOAD from triggering a redundant push back.

`loadAppData()` in `src/utils/storage.ts` includes **migration logic**: if the stored JSON has a top-level `rides` array (old flat format), it is automatically moved into the `cycling` bucket.

### Consuming state in screens

```ts
const { data, sportData, switchSport } = useApp();
// data        — full AppData (use for profile, notifications, activeSport)
// sportData   — data[activeSport] SportBucket (use for rides, achievements, challenges, unlockedBadges)
```

Always read ride/achievement/challenge/badge data from `sportData`, never directly from `data.cycling` or `data.running`. This ensures the UI always reflects the active sport without extra branching.

### Auth & routing

- `src/lib/supabase.ts` — Supabase client with AsyncStorage session persistence and AppState-based token refresh
- `src/context/AppContext.tsx` exposes `session`, `signIn`, `signUp`, `signOut`
- Routing guard lives in `app/(tabs)/index.tsx`: after `loaded && navState.key` are both truthy, redirects to `/auth` if no session, then to `/onboarding` if `!hasSeenOnboarding`
- `app/auth.tsx` — email/password sign-in and sign-up with email-confirmation fallback screen

### Supabase schema

Three tables: `profiles` (one row per user), `rides` (one row per ride, upserted by `id`), `user_data` (single JSONB row). All have RLS policies. Schema lives in `supabase/schema.sql`.

Sport-specific columns added via migration at the bottom of `schema.sql`:
- `profiles.active_sport TEXT DEFAULT 'cycling'`
- `rides.sport TEXT DEFAULT 'cycling'` — rows are partitioned by sport on pull
- `user_data`: `running_achievements`, `running_challenges`, `running_unlocked_badges` JSONB columns

**Important**: `pushToSupabase` only upserts — it cannot delete rows. `deleteRide` calls `deleteRideRemote` directly. `resetData` calls `resetUserDataRemote` which deletes all rides then re-pushes.

**Important**: `pullFromSupabase` preserves two local-only fields that are never stored in Supabase: `isEstimatedDistance` on individual rides (maintained via a local ride map lookup), and `indoorCyclingSpeed` on the profile. Both `lastSyncDate` fields are also preserved from local (Apple Health sync is device-specific).

### Static definitions vs. runtime state

| Static (constants) | Runtime (stored in AsyncStorage + Supabase) |
|---|---|
| `src/constants/achievements.ts` — 12 cycling `AchievementDef` | `AchievementState[]` in `cycling` bucket |
| `src/constants/runningAchievements.ts` — 12 running `AchievementDef` | `AchievementState[]` in `running` bucket |
| `src/constants/challenges.ts` — cycling `ChallengeDef` list | `ChallengeState[]` in `cycling` bucket |
| `src/constants/runningChallenges.ts` — 14 running challenges incl. real races | `ChallengeState[]` in `running` bucket |
| `src/constants/levelBadges.ts` — 14 `LevelBadgeDef` unlocking at levels 2–15 | `unlockedBadges: string[]` per sport bucket |

Adding a new achievement = add to the appropriate `*_DEFS` array. The evaluator in `src/utils/achievements.ts` picks it up automatically.

Challenge types: `'rides'` | `'duration'` | `'distance'` | `'calories'` | `'streak'`. Progress filtering respects `enrolledDate` so only post-join rides count.

### Level system

`src/utils/levels.ts` exports `LEVEL_THRESHOLDS` (30-level geometric progression starting at 20 miles, ×1.5 gap per level) and `getLevelInfo(totalMiles)`. The `CycleTrack` component accepts an `animate` prop — when `false` it snaps to the current position without running the animation or firing `onLevelUp`. The home screen only sets `animate={true}` when `celebrationSignal.pending` was true (i.e., a new ride was just logged), preventing the animation from replaying on every tab focus.

### Apple Health sync

`src/utils/healthKit.ts` exports:
- `fetchCyclingWorkouts(since)` — filters for activity names containing "cycl"
- `fetchRunningWorkouts(since)` — filters for activity names containing "run"
- `workoutToRide(workout, indoorSpeedKmh)` — converts an HKWorkout to a `Ride`; if `workout.distance` is null/0 (indoor cycling on Apple Watch), distance is **estimated** as `(duration_hours × indoorSpeedKmh)` and `isEstimatedDistance: true` is set on the ride

`app/log-ride.tsx` chooses the fetch function based on `activeSport` and passes `indoorCyclingSpeed` (from `data.profile`) only when syncing cycling. The `lastSyncDate` it reads/writes is `sportData.lastSyncDate` (per-sport, not global).

### Cross-screen event signals

Two module-level mutable objects coordinate events between `log-ride.tsx` and `app/(tabs)/index.tsx` after `router.back()`:

- `src/utils/celebrationSignal.ts` — `{ pending: boolean }` triggers confetti + trumpet
- `src/utils/challengeCompleteSignal.ts` — `{ ids: string[] }` triggers `ChallengeCompleteModal`

The home screen reads these in `useFocusEffect`. The ordering is: confetti → `startTrackOrShowChallenge()` → (challenge modal if needed) → `setIsFocused(true)` → CycleTrack animates → `LevelUpModal` if leveled up.

### Navigation

```
app/
  _layout.tsx        — root Stack, wraps everything in <AppProvider>
  auth.tsx           — sign in / sign up (gestureEnabled: false)
  onboarding.tsx     — first-launch walkthrough (gestureEnabled: false)
  (tabs)/
    _layout.tsx      — bottom tab bar (Home, Stats, Challenges, Profile)
    index.tsx        — Home — routing guard lives here
    stats.tsx        — Stats, calendar (selected day filters ride history)
    challenges.tsx   — Challenges & Achievements
    profile.tsx      — Profile, level badges, sign out
  log-ride.tsx       — Apple Health sync modal (cycling or running based on activeSport)
  log-ride-manual.tsx — manual ride entry modal
  settings.tsx       — pushed from Profile; includes sport switcher (🚴/🏃 toggle)
  dev-tools.tsx      — developer testing panel (visual triggers + data tools)
```

### Theme

All colors, spacing, radii, font sizes, and shadow presets are in `src/constants/theme.ts`. Import `COLORS`, `SPACING`, `FONT`, `RADIUS`, `SHADOW` — never hardcode values in component files.

### Key utilities

| File | Purpose |
|---|---|
| `src/utils/sync.ts` | `pushToSupabase`, `pullFromSupabase`, `deleteRideRemote`, `resetUserDataRemote` |
| `src/utils/healthKit.ts` | `fetchCyclingWorkouts`, `fetchRunningWorkouts`, `workoutToRide` (with indoor estimation) |
| `src/utils/levels.ts` | `LEVEL_THRESHOLDS`, `getLevelInfo(totalMiles)` |
| `src/utils/streaks.ts` | `calcCurrentStreak`, `calcLongestStreak`, `ridesThisWeek` |
| `src/utils/challenges.ts` | `progressForChallenge` (respects `enrolledDate`), `evaluateChallenges`, `getPersonalRecords` |
| `src/utils/achievements.ts` | Runs all `AchievementDef.check()` calls, returns newly earned IDs |
| `src/utils/format.ts` | `formatDuration`, `formatDistance`, `greetingForHour` |
| `src/utils/notifications.ts` | `scheduleDaily`, `sendStreakCelebration`, `setupNotificationHandler` |
