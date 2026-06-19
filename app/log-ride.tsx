import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import {
  isHealthKitAvailable,
  requestHealthKitPermissions,
  fetchCyclingWorkouts,
  fetchRunningWorkouts,
  workoutToRide,
  filterNewWorkouts,
  HKWorkout,
} from '@/utils/healthKit';
import { formatDuration } from '@/utils/format';
import { celebrationSignal } from '@/utils/celebrationSignal';
import { challengeCompleteSignal } from '@/utils/challengeCompleteSignal';
import { generateRideRecap, generateNudge } from '@/utils/aiCoaching';
import { InsightCard } from '@/components/InsightCard';
import { calcCurrentStreak, calcLongestStreak, ridesThisWeek } from '@/utils/streaks';
import { CHALLENGE_DEFS } from '@/constants/challenges';
import { RUNNING_CHALLENGE_DEFS } from '@/constants/runningChallenges';
import { ACHIEVEMENT_DEFS } from '@/constants/achievements';
import { RUNNING_ACHIEVEMENT_DEFS } from '@/constants/runningAchievements';
import { subDays } from 'date-fns';
import { sendStreakCelebration } from '@/utils/notifications';
import { format, formatDistanceToNow } from 'date-fns';

type Status = 'idle' | 'requesting' | 'syncing' | 'done' | 'importing' | 'complete' | 'error';

export default function LogRideScreen() {
  const { data, sportData, session, importRides, setLastHealthSyncDate, setAiInsight } = useApp();
  const activeSport = data.profile.activeSport ?? 'cycling';

  const [status, setStatus] = useState<Status>('idle');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pendingWorkouts, setPendingWorkouts] = useState<HKWorkout[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [recapContent, setRecapContent] = useState<string | null>(null);
  const [nudgeContent, setNudgeContent] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);

  const healthAvailable = isHealthKitAvailable();
  const existingIds = new Set(sportData.rides.map((r) => r.id));

  // On mount, auto-request permissions on iOS
  useEffect(() => {
    if (!healthAvailable) return;
    handleRequestPermission();
  }, []);

  async function handleRequestPermission() {
    setStatus('requesting');
    try {
      await requestHealthKitPermissions();
      setPermissionGranted(true);
      setStatus('idle');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Permission denied');
      setStatus('error');
    }
  }

  async function handleSync() {
    setStatus('syncing');
    setErrorMsg('');
    setPendingWorkouts([]);
    try {
      const since = sportData.lastSyncDate
        ? new Date(sportData.lastSyncDate)
        : new Date(0); // epoch = all time
      const fetchFn = activeSport === 'running' ? fetchRunningWorkouts : fetchCyclingWorkouts;
      const workouts = await fetchFn(since);
      const newWorkouts = filterNewWorkouts(workouts, existingIds);
      setPendingWorkouts(newWorkouts);
      setSelectedIds(new Set(newWorkouts.map((w) => w.id))); // default all selected
      setStatus('done');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to fetch workouts');
      setStatus('error');
    }
  }

  function toggleWorkout(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === pendingWorkouts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingWorkouts.map((w) => w.id)));
    }
  }

  async function handleImportAll() {
    const toImport = pendingWorkouts.filter((w) => selectedIds.has(w.id));
    if (toImport.length === 0) return;
    setStatus('importing');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const indoorSpeed = activeSport === 'cycling' ? (data.profile.indoorCyclingSpeed ?? 20) : 0;
    const rides = toImport.map((w) => workoutToRide(w, indoorSpeed));
    const result = importRides(rides);

    // Mark sync date as the most recent selected workout's start time
    const latestDate = toImport.reduce((latest, w) =>
      w.start > latest ? w.start : latest,
      toImport[0].start,
    );
    await setLastHealthSyncDate(latestDate);

    if (result.completedChallenges.length > 0) {
      challengeCompleteSignal.ids = result.completedChallenges;
    }
    celebrationSignal.pending = true;

    const allRides = [...rides, ...sportData.rides];
    const newStreak = calcCurrentStreak(allRides);
    if (data.notifications.streakCelebrations && newStreak > 0 && newStreak % 5 === 0) {
      sendStreakCelebration(newStreak);
    }

    setImportedCount(toImport.length);
    setStatus('complete');

    if (session) {
      const defs = activeSport === 'running' ? RUNNING_CHALLENGE_DEFS : CHALLENGE_DEFS;
      const cutoff = subDays(new Date(), 30);
      const recentRides = allRides.filter((r) => new Date(r.date) >= cutoff);

      const enrolledChallenges = sportData.challenges
        .filter((s) => s.enrolled && !s.completed)
        .flatMap((s) => {
          const def = defs.find((d) => d.id === s.id);
          return def ? [{ name: def.name, pct: Math.round((s.progress / def.target) * 100) }] : [];
        });

      const availableChallenges = defs
        .filter((d) => !sportData.challenges.find((s) => s.id === d.id && s.enrolled))
        .slice(0, 4)
        .map((d) => ({ name: d.name, description: d.description }));

      setNudgeLoading(true);

      Promise.allSettled([
        generateRideRecap({
          newRides: rides,
          allRides,
          sport: activeSport,
          distanceUnit: data.profile.distanceUnit,
        }),
        generateNudge({
          rides: recentRides,
          currentStreak: calcCurrentStreak(allRides),
          longestStreak: calcLongestStreak(allRides),
          weeklyGoal: data.profile.weeklyRideGoal,
          ridesThisWeek: ridesThisWeek(allRides).length,
          sport: activeSport,
          distanceUnit: data.profile.distanceUnit,
          enrolledChallenges,
          availableChallenges,
          achievementsEarned: sportData.achievements.filter((a) => a.earned).length,
          totalAchievements: (activeSport === 'running' ? RUNNING_ACHIEVEMENT_DEFS : ACHIEVEMENT_DEFS).length,
        }),
      ]).then(([recapResult, nudgeResult]) => {
        if (recapResult.status === 'fulfilled') {
          setRecapContent(recapResult.value);
          setAiInsight('rideRecap', { content: recapResult.value, createdAt: new Date().toISOString() });
        }
        if (nudgeResult.status === 'fulfilled') {
          setAiInsight('nudge', { content: nudgeResult.value, createdAt: new Date().toISOString() });
          setNudgeContent(nudgeResult.value);
        }
      }).finally(() => setNudgeLoading(false));
    }
  }

  function renderLastSync() {
    if (!sportData.lastSyncDate) return 'Never synced';
    return `Last synced ${formatDistanceToNow(new Date(sportData.lastSyncDate), { addSuffix: true })}`;
  }

  function renderWorkoutRow(workout: HKWorkout) {
    const durationMins = Math.max(1, Math.round(workout.duration / 60));
    const hasGpsDistance = workout.distance != null && workout.distance > 0;
    const indoorSpeed = activeSport === 'cycling' ? (data.profile.indoorCyclingSpeed ?? 20) : 0;
    const rawKm = hasGpsDistance
      ? workout.distance! * 1.60934
      : indoorSpeed > 0 ? (workout.duration / 3600) * indoorSpeed : 0;
    const usesMiles = data.profile.distanceUnit === 'miles';
    const distanceVal = usesMiles ? (rawKm * 0.621371).toFixed(1) : rawKm.toFixed(1);
    const distanceLabel = hasGpsDistance
      ? `${distanceVal} ${usesMiles ? 'mi' : 'km'}`
      : `~${distanceVal} ${usesMiles ? 'mi' : 'km'}`;
    const date = format(new Date(workout.start), 'MMM d, h:mm a');
    const source = workout.sourceName ?? 'Apple Health';
    const selected = selectedIds.has(workout.id);

    return (
      <TouchableOpacity
        key={workout.id}
        style={[styles.workoutRow, selected && styles.workoutRowSelected]}
        onPress={() => toggleWorkout(workout.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.workoutIcon}>
          <Icon name={activeSport === 'running' ? 'runner' : 'bicycle'} size={20} color={COLORS.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.workoutSource}>{source}</Text>
          <Text style={styles.workoutDate}>{date}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.workoutStat}>{durationMins} min</Text>
          <Text style={[styles.workoutStatSub, !hasGpsDistance && styles.workoutStatEst]}>
            {distanceLabel}
          </Text>
          {workout.calories != null && (
            <Text style={styles.workoutStatSub}>{Math.round(workout.calories)} kcal</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{activeSport === 'running' ? 'Sync Runs' : 'Sync Rides'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Not iOS ── */}
        {!healthAvailable && (
          <View style={styles.centerBlock}>
            <Icon name="phone" size={52} color={COLORS.textSecondary} />
            <Text style={styles.centerTitle}>iPhone Only</Text>
            <Text style={styles.centerSub}>
              Apple Health integration is only available on iPhone. Add your ride manually below.
            </Text>
            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => { router.replace('/log-ride-manual'); }}
            >
              <Text style={styles.manualBtnText}>Add Manually</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── iOS: requesting / error ── */}
        {healthAvailable && status === 'requesting' && (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.centerSub, { marginTop: SPACING.md }]}>
              Requesting Apple Health access…
            </Text>
          </View>
        )}

        {healthAvailable && status === 'error' && (
          <View style={styles.centerBlock}>
            <Icon name="warning" size={52} color={COLORS.streak} />
            <Text style={styles.centerTitle}>Something went wrong</Text>
            <Text style={styles.centerSub}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRequestPermission}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── iOS: permission granted → sync UI ── */}
        {healthAvailable && permissionGranted && (status === 'idle' || status === 'syncing' || status === 'done' || status === 'importing' || status === 'complete') && (
          <>
            {/* Health card */}
            <View style={styles.healthCard}>
              <View style={styles.healthCardLeft}>
                <Text style={styles.healthCardIcon}>❤️</Text>
                <View>
                  <Text style={styles.healthCardTitle}>Apple Health</Text>
                  <Text style={styles.healthCardSub}>{renderLastSync()}</Text>
                </View>
              </View>
              {(status === 'idle' || status === 'done') && (
                <TouchableOpacity onPress={handleSync} style={styles.syncBadge}>
                  <Text style={styles.syncBadgeText}>Sync Now</Text>
                </TouchableOpacity>
              )}
              {status === 'syncing' && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </View>

            {/* Complete state — recap + nudge */}
            {status === 'complete' && (
              <>
                <View style={styles.successRow}>
                  <Text style={styles.successText}>
                    ✓ {importedCount} {activeSport === 'running' ? 'run' : 'ride'}{importedCount !== 1 ? 's' : ''} imported
                  </Text>
                </View>
                {recapContent && <InsightCard insight={recapContent} />}
                {nudgeLoading && (
                  <View style={styles.nudgeLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.nudgeLoadingText}>Getting your coaching tip…</Text>
                  </View>
                )}
                {nudgeContent && <InsightCard insight={nudgeContent} />}
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Syncing indicator */}
            {status === 'syncing' && (
              <View style={styles.centerBlock}>
                <Text style={styles.centerSub}>Fetching {activeSport} workouts…</Text>
              </View>
            )}

            {/* Results: no new workouts */}
            {status === 'done' && pendingWorkouts.length === 0 && (
              <View style={styles.centerBlock}>
                <Icon name="check" size={52} color={COLORS.primary} />
                <Text style={styles.centerTitle}>All caught up!</Text>
                <Text style={styles.centerSub}>No new {activeSport} workouts found.</Text>
              </View>
            )}

            {/* Results: workouts to import */}
            {(status === 'done' || status === 'importing') && pendingWorkouts.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>
                    {pendingWorkouts.length} new workout{pendingWorkouts.length !== 1 ? 's' : ''} found
                  </Text>
                  <TouchableOpacity onPress={toggleSelectAll}>
                    <Text style={styles.selectAllText}>
                      {selectedIds.size === pendingWorkouts.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.workoutList}>
                  {pendingWorkouts.map(renderWorkoutRow)}
                </View>

                <TouchableOpacity
                  onPress={handleImportAll}
                  activeOpacity={0.85}
                  disabled={status === 'importing' || selectedIds.size === 0}
                  style={{ marginTop: SPACING.lg }}
                >
                  <LinearGradient
                    colors={selectedIds.size === 0 ? ['#555', '#444'] : [COLORS.primary, '#00A882']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.importBtn, SHADOW.primary, status === 'importing' && { opacity: 0.6 }]}
                  >
                    {status === 'importing'
                      ? <ActivityIndicator color={COLORS.black} />
                      : <Text style={styles.importBtnText}>
                          Import {selectedIds.size} {activeSport === 'running' ? 'Run' : 'Ride'}{selectedIds.size !== 1 ? 's' : ''}
                        </Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add manually link — always visible on iOS */}
      {healthAvailable && (
        <View style={styles.footer}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
            onPress={() => { router.replace('/log-ride-manual'); }}
            style={styles.manualLink}
          >
            <Text style={styles.manualLinkText}>{activeSport === 'running' ? 'Add a run manually' : 'Add a ride manually'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
  },
  closeText: { fontSize: FONT.size.sm, color: COLORS.textSecondary },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  centerBlock: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  bigIcon: { fontSize: 52, marginBottom: SPACING.xs },
  centerTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  centerSub: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },

  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  healthCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  healthCardIcon: { fontSize: 28 },
  healthCardTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  healthCardSub: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  syncBadgeText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.black,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectAllText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  workoutList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  workoutRowSelected: {
    backgroundColor: COLORS.primary + '12',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: FONT.weight.bold,
    color: COLORS.black,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutSource: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  workoutDate: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  workoutStat: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  workoutStatSub: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  workoutStatEst: {
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },

  importBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  importBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
    letterSpacing: 0.3,
  },

  successRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  nudgeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  nudgeLoadingText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  doneBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  doneBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
  },

  retryBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retryBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  manualBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualBtnText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  footer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
  },
  manualLink: { alignItems: 'center', paddingVertical: SPACING.xs },
  manualLinkText: {
    fontSize: FONT.size.sm,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },
});
