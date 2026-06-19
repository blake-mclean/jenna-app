import { Platform, NativeModules } from 'react-native';
import type { HKWorkoutQueriedSampleType, HKErrorResponse } from 'react-native-health';
import { Ride } from '../types';

// Access the native module directly to avoid react-native-health's broken
// ESM/CJS hybrid export which causes Metro to wrap it incorrectly.
const HK = NativeModules.AppleHealthKit;

// ─── Re-export for callers ────────────────────────────────────────────────────

export type HKWorkout = HKWorkoutQueriedSampleType;

// ─── Availability ─────────────────────────────────────────────────────────────

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && !!HK;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export function requestHealthKitPermissions(): Promise<void> {
  const permissions = {
    permissions: {
      read: ['Workout'],
      write: [] as string[],
    },
  };

  return new Promise((resolve, reject) => {
    HK.initHealthKit(permissions, (error: string) => {
      if (error) reject(new Error(error));
      else resolve();
    });
  });
}

// ─── Workout fetching ─────────────────────────────────────────────────────────
// getAnchoredWorkouts returns: id, activityName, start, end,
// duration (seconds), distance (miles), calories (kcal), sourceName.

export function fetchCyclingWorkouts(since: Date): Promise<HKWorkout[]> {
  return new Promise((resolve, reject) => {
    const options = {
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
    };

    HK.getAnchoredWorkouts(options, (error: HKErrorResponse, results: any) => {
      if (error?.message) {
        reject(new Error(error.message));
        return;
      }
      const all: HKWorkout[] = results?.data ?? [];
      const cycling = all.filter((w) =>
        w.activityName?.toLowerCase().includes('cycl')
      );
      resolve(cycling);
    });
  });
}

export function fetchRunningWorkouts(since: Date): Promise<HKWorkout[]> {
  return new Promise((resolve, reject) => {
    const options = {
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
    };

    HK.getAnchoredWorkouts(options, (error: HKErrorResponse, results: any) => {
      if (error?.message) {
        reject(new Error(error.message));
        return;
      }
      const all: HKWorkout[] = results?.data ?? [];
      const running = all.filter((w) =>
        w.activityName?.toLowerCase().includes('run')
      );
      resolve(running);
    });
  });
}

// ─── Conversion ───────────────────────────────────────────────────────────────
// distance: miles → km (native returns miles via [HKUnit mileUnit])
// Indoor cycling workouts (Apple Watch) don't record GPS distance, so we
// estimate from duration × the user's configured indoor speed (default 20 km/h).

export function workoutToRide(workout: HKWorkout, indoorSpeedKmh = 20): Ride {
  const hasGpsDistance = workout.distance != null && workout.distance > 0;
  const distanceKm = hasGpsDistance
    ? parseFloat((workout.distance! * 1.60934).toFixed(2))
    : parseFloat(((workout.duration / 3600) * indoorSpeedKmh).toFixed(2));

  return {
    id: workout.id,
    date: workout.start,
    duration: Math.max(1, Math.round(workout.duration / 60)),
    distance: distanceKm,
    isEstimatedDistance: !hasGpsDistance,
    calories: workout.calories ? Math.round(workout.calories) : undefined,
    instructor: workout.sourceName ?? undefined,
  };
}

// ─── Deduplication ───────────────────────────────────────────────────────────

export function filterNewWorkouts(workouts: HKWorkout[], existingRideIds: Set<string>): HKWorkout[] {
  return workouts.filter((w) => !existingRideIds.has(w.id));
}
