# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Read the docs first

**Before writing any code**, read the exact versioned SDK docs at https://docs.expo.dev/versions/v54.0.0/ — APIs shift between SDK versions and the wrong version will silently break things.

## Commands

```bash
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
npx expo start --tunnel --port 8083   # Expo Go on physical device (port 8081 may be taken)
npx tsc --noEmit   # Type-check (no test suite exists)
npx expo config    # Verify app.json resolves without plugin errors
```

When installing new Expo packages, always use `npx expo install <pkg>` (not `npm install`) so the correct SDK-54-compatible version is resolved. For non-Expo packages, use `npm install --legacy-peer-deps`.

## SDK and compatibility constraints

- **Expo SDK 54** — target for Expo Go on device
- expo-router **~6.0.24** — file-based routing
- React 19.1.0 / React Native 0.81.5
- `expo-status-bar` does **not** have a config plugin in v3.x — do not add it to the `plugins` array in `app.json`
- All state is **local-only** (AsyncStorage). No backend or database yet.

## Architecture

### Data flow

All app state lives in `src/context/AppContext.tsx` — a single `useReducer` store backed by AsyncStorage (`src/utils/storage.ts`). Every write dispatches an action; the reducer runs `evaluateAchievements` and `evaluateChallenges` inline so derived state stays consistent. The store is loaded once on mount; any change triggers a full `saveAppData` call.

Consume state with `useApp()` from any screen. The `addRide()` method returns a `string[]` of newly-earned achievement IDs so the caller can trigger celebrations.

### Static definitions vs. runtime state

- `src/constants/achievements.ts` — 12 `AchievementDef` objects with a `check(rides, streak)` predicate
- `src/constants/challenges.ts` — 7 `ChallengeDef` objects describing targets and types
- `src/types/index.ts` — `AchievementState` / `ChallengeState` are the per-user runtime counterparts stored in AsyncStorage

Adding a new achievement = add an entry to `ACHIEVEMENT_DEFS`. The evaluator in `src/utils/achievements.ts` picks it up automatically on the next ride log.

### Navigation

expo-router file-based routing:

```
app/
  _layout.tsx        — root Stack, wraps everything in <AppProvider>
  (tabs)/
    _layout.tsx      — bottom tab bar (Home, Stats, Challenges, Profile)
    index.tsx        — Home
    stats.tsx        — Stats & Progress
    challenges.tsx   — Challenges & Achievements
    profile.tsx      — Profile
  log-ride.tsx       — modal (presented over tabs)
  settings.tsx       — pushed from Profile tab
```

### Key utilities

| File | Purpose |
|---|---|
| `src/utils/streaks.ts` | `calcCurrentStreak`, `calcLongestStreak`, `ridesThisWeek` |
| `src/utils/achievements.ts` | Runs all `AchievementDef.check()` calls, returns newly earned IDs |
| `src/utils/challenges.ts` | Updates `ChallengeState.progress` for enrolled challenges; also `getPersonalRecords` |
| `src/utils/notifications.ts` | `scheduleDaily` (DAILY trigger), `sendStreakCelebration` (immediate), `setupNotificationHandler` |
| `src/utils/format.ts` | `formatDuration`, `formatDistance`, `greetingForHour`, etc. |

### Theme

All colors, spacing, radii, font sizes, and shadow presets are in `src/constants/theme.ts`. Import `COLORS`, `SPACING`, `FONT`, `RADIUS`, `SHADOW` — never hardcode values in component files.

### SVG charts

`src/components/ProgressChart.tsx` exports a `BarChart` built directly on `react-native-svg` (no chart library). The `WeeklyRing` component (`src/components/WeeklyRing.tsx`) is an SVG ring using stroke-dashoffset.
