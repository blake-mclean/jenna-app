# JENNA

A personal indoor cycling companion built with Expo (React Native). Log rides, track your progress, level up, earn badges, and take on real-world cycling challenges.

## Features

- **Ride logging** — duration, distance, calories, resistance, heart rate, instructor, notes
- **Cycle Level track** — animated oval track that fills as you accumulate miles; level up to unlock profile badges
- **Challenges** — join real-world events (Tour de France, Paris-Roubaix, Seattle to Portland, etc.) or structured challenges (streaks, calorie goals, weekly targets)
- **Achievements** — 12 unique badges earned automatically as you hit milestones
- **Stats & calendar** — bar charts, personal records, and a ride calendar that filters history by selected day
- **Onboarding** — first-launch walkthrough explaining the app
- **Supabase sync** — rides and progress synced to the cloud with local AsyncStorage caching for instant startup
- **Developer tools** — trigger visual events, build test streaks, and reset data without touching prod

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (managed workflow) |
| Navigation | expo-router v6 (file-based) |
| Language | TypeScript |
| State | React `useReducer` + AsyncStorage (local-first cache) |
| Backend / Auth | Supabase (Postgres + Row Level Security) |
| UI | React Native + react-native-svg |
| Audio | expo-av |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo`)
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/blake-mclean/jenna-app.git
cd jenna-app
npm install --legacy-peer-deps
```

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the Supabase schema from `supabase/schema.sql` in your project's SQL editor, then start the app:

```bash
npx expo start
```

## Project Structure

```
app/                    # expo-router screens
  (tabs)/               # bottom tab bar
    index.tsx           # Home
    stats.tsx           # Stats & calendar
    challenges.tsx      # Challenges & achievements
    profile.tsx         # Profile & badges
  log-ride.tsx          # Log ride modal
  auth.tsx              # Sign in / sign up
  onboarding.tsx        # First-launch walkthrough
  dev-tools.tsx         # Developer testing panel
src/
  components/           # Shared UI components
  constants/            # Static definitions (achievements, challenges, badges, theme)
  context/              # AppContext (state + Supabase sync)
  lib/                  # Supabase client
  types/                # TypeScript interfaces
  utils/                # Streaks, levels, sync, notifications, format helpers
assets/
  sounds/               # triumph.mp3
```

## Running on a Physical Device

```bash
npx expo start --tunnel --port 8083
```

Scan the QR code with Expo Go (iOS / Android).
