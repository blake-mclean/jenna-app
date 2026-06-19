import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { RideCard } from '@/components/RideCard';
import { RideDetailModal } from '@/components/RideDetailModal';
import { Ride } from '@/types';
import { BarChart } from '@/components/ProgressChart';
import { calcCurrentStreak, calcLongestStreak } from '@/utils/streaks';
import { formatDuration } from '@/utils/format';
import { getPersonalRecords } from '@/utils/challenges';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import { InsightCard } from '@/components/InsightCard';
import { Icon } from '@/components/Icon';
import { generateReflection } from '@/utils/aiCoaching';
import { parseISO, format, subDays, eachDayOfInterval } from 'date-fns';

type ChartMode = 'rides' | 'duration' | 'distance';

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function StatsScreen() {
  const { data, sportData, session, deleteRide, updateRide, setAiInsight } = useApp();
  const { profile } = data;
  const { rides } = sportData;
  const [chartMode, setChartMode] = useState<ChartMode>('rides');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [reflectionPeriod, setReflectionPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [reflectionLoading, setReflectionLoading] = useState(false);

  // Reset to today whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setSelectedDate(todayStr());
    }, [])
  );

  const streak = calcCurrentStreak(rides);
  const longestStreak = calcLongestStreak(rides);

  const activeReflection = reflectionPeriod === 'weekly'
    ? sportData.lastWeeklyReflection
    : sportData.lastMonthlyReflection;

  const reflectionKind = reflectionPeriod === 'weekly' ? 'weeklyReflection' : 'monthlyReflection';

  function isWithin24h(insight: { createdAt: string } | undefined) {
    if (!insight) return false;
    return Date.now() - new Date(insight.createdAt).getTime() < 24 * 60 * 60 * 1000;
  }

  const canRegenerate = !isWithin24h(activeReflection);

  async function handleGenerateReflection() {
    if (!session || reflectionLoading || !canRegenerate) return;
    setReflectionLoading(true);
    try {
      const content = await generateReflection({
        rides,
        currentStreak: streak,
        longestStreak,
        weeklyGoal: profile.weeklyRideGoal,
        sport: profile.activeSport ?? 'cycling',
        distanceUnit: profile.distanceUnit,
        period: reflectionPeriod,
      });
      setAiInsight(reflectionKind, { content, createdAt: new Date().toISOString() });
    } catch (_) {
      // silent fail
    } finally {
      setReflectionLoading(false);
    }
  }
  const { totalMinutes, totalKm, totalCal } = useMemo(() => {
    let totalMinutes = 0, totalKm = 0, totalCal = 0;
    for (const r of rides) {
      totalMinutes += r.duration;
      totalKm += r.distance ?? 0;
      totalCal += r.calories ?? 0;
    }
    return { totalMinutes, totalKm, totalCal };
  }, [rides]);
  const prs = useMemo(() => getPersonalRecords(rides), [rides]);

  const moodStats = useMemo(() => {
    const withMood = rides.filter((r) => r.mood != null);
    if (withMood.length === 0) return null;
    const counts = [1, 2, 3, 4, 5].map((m) => withMood.filter((r) => r.mood === m).length);
    const high = withMood.filter((r) => r.mood! >= 4);
    const low = withMood.filter((r) => r.mood! <= 3);
    if (withMood.length >= 10 && high.length >= 2 && low.length >= 2) {
      const avgHigh = high.reduce((s, r) => s + r.duration, 0) / high.length;
      const avgLow = low.reduce((s, r) => s + r.duration, 0) / low.length;
      const minAvg = Math.min(avgHigh, avgLow);
      const pct = minAvg > 0 ? Math.round(Math.abs(avgHigh - avgLow) / minAvg * 100) : 0;
      return { total: withMood.length, counts, pct, higherOnGood: avgHigh > avgLow };
    }
    return { total: withMood.length, counts, pct: null };
  }, [rides]);

  // Rides for the selected calendar day
  const dayRides = useMemo(
    () => rides.filter((r) => format(parseISO(r.date), 'yyyy-MM-dd') === selectedDate),
    [rides, selectedDate],
  );

  // Calendar: mark days with rides; highlight the selected day
  const markedDates = useMemo(() => {
    const base = rides.reduce<Record<string, any>>((acc, r) => {
      const key = format(parseISO(r.date), 'yyyy-MM-dd');
      acc[key] = { marked: true, dotColor: COLORS.primary };
      return acc;
    }, {});
    base[selectedDate] = {
      ...(base[selectedDate] ?? {}),
      selected: true,
      selectedColor: COLORS.primary,
      selectedTextColor: COLORS.black,
      marked: dayRides.length > 0,
      dotColor: COLORS.black,
    };
    return base;
  }, [rides, selectedDate, dayRides.length]);

  const distanceUnit = profile.distanceUnit;

  // Last 7 days chart data
  const chartData = useMemo(() => {
    const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return last7.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRides = rides.filter((r) => format(parseISO(r.date), 'yyyy-MM-dd') === dayStr);
      let value = 0;
      if (chartMode === 'rides') value = dayRides.length;
      else if (chartMode === 'duration') value = dayRides.reduce((s, r) => s + r.duration, 0);
      else {
        const km = dayRides.reduce((s, r) => s + (r.distance ?? 0), 0);
        value = distanceUnit === 'miles' ? km * 0.621371 : km;
      }
      return { label: format(day, 'EEE')[0], value };
    });
  }, [rides, chartMode, distanceUnit]);

  if (rides.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyRoot}>
          <Icon name={profile.activeSport === 'running' ? 'runner' : 'bicycle'} size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>No {profile.activeSport === 'running' ? 'runs' : 'rides'} yet</Text>
          <Text style={styles.emptyBody}>
            Your stats, streaks, and personal records will appear here once you start logging.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Stats & Progress</Text>

        {/* Streak row */}
        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <Text style={styles.streakVal}>{streak}</Text>
            <Text style={styles.streakLabel}>Current 🔥</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakVal}>{longestStreak}</Text>
            <Text style={styles.streakLabel}>Best streak</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakVal}>{rides.length}</Text>
            <Text style={styles.streakLabel}>Total {profile.activeSport === 'running' ? 'runs' : 'rides'}</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakVal}>{formatDuration(totalMinutes)}</Text>
            <Text style={styles.streakLabel}>Total time</Text>
          </View>
        </View>

        {/* Personal Records */}
        {prs && (
          <>
            <Text style={styles.sectionTitle}>Personal Records 🏅</Text>
            <View style={styles.prRow}>
              <View style={styles.prCard}>
                <Text style={styles.prIcon}>⏱️</Text>
                <Text style={styles.prVal}>{formatDuration(prs.longestRide)}</Text>
                <Text style={styles.prLabel}>Longest {profile.activeSport === 'running' ? 'run' : 'ride'}</Text>
              </View>
              {prs.longestDistance > 0 && (
                <View style={styles.prCard}>
                  <Text style={styles.prIcon}>🗺️</Text>
                  <Text style={styles.prVal}>
                    {profile.distanceUnit === 'miles'
                      ? `${(prs.longestDistance * 0.621371).toFixed(1)} mi`
                      : `${prs.longestDistance.toFixed(1)} km`}
                  </Text>
                  <Text style={styles.prLabel}>Longest distance</Text>
                </View>
              )}
              {prs.mostCalories > 0 && (
                <View style={styles.prCard}>
                  <Text style={styles.prIcon}>🔥</Text>
                  <Text style={styles.prVal}>{prs.mostCalories}</Text>
                  <Text style={styles.prLabel}>Most calories</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Mood Insights */}
        {moodStats && (
          <>
            <Text style={styles.sectionTitle}>Mood Insights</Text>
            <View style={styles.moodCard}>
              {moodStats.pct !== null ? (
                <Text style={styles.moodCorrelation}>
                  You go{' '}
                  <Text style={styles.moodCorrelationHighlight}>
                    {moodStats.pct}% {moodStats.higherOnGood ? 'longer' : 'shorter'}
                  </Text>
                  {' '}on high-mood days 😄🔥
                </Text>
              ) : (
                <Text style={styles.moodProgress}>
                  {10 - moodStats.total} more rated {10 - moodStats.total === 1 ? 'ride' : 'rides'} to unlock insights
                </Text>
              )}
              <View style={styles.moodDistRow}>
                {(['😴', '😕', '😊', '😄', '🔥'] as const).map((emoji, i) => (
                  <View key={i} style={styles.moodDistItem}>
                    <Text style={styles.moodDistEmoji}>{emoji}</Text>
                    <Text style={styles.moodDistCount}>{moodStats.counts[i]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Chart */}
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartModeRow}>
          {(['rides', 'duration', 'distance'] as ChartMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, chartMode === m && styles.modeBtnActive]}
              onPress={() => setChartMode(m)}
            >
              <Text style={[styles.modeBtnText, chartMode === m && styles.modeBtnTextActive]}>
                {m === 'rides' ? (profile.activeSport === 'running' ? 'Runs' : 'Rides') : m === 'duration' ? 'Minutes' : distanceUnit === 'miles' ? 'mi' : 'km'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chartWrap}>
          <BarChart
            data={chartData}
            color={COLORS.primary}
            unit={chartMode === 'rides' ? '' : chartMode === 'duration' ? 'm' : distanceUnit === 'miles' ? 'mi' : 'k'}
          />
        </View>

        {/* Calendar */}
        <Text style={styles.sectionTitle}>{profile.activeSport === 'running' ? 'Run' : 'Ride'} Calendar</Text>
        <View style={styles.calendarWrap}>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: COLORS.surface,
              calendarBackground: COLORS.surface,
              textSectionTitleColor: COLORS.textSecondary,
              dayTextColor: COLORS.textPrimary,
              todayTextColor: COLORS.primary,
              selectedDayTextColor: COLORS.black,
              selectedDayBackgroundColor: COLORS.primary,
              dotColor: COLORS.primary,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.textPrimary,
              textDisabledColor: COLORS.textTertiary,
              'stylesheet.calendar.header': {
                week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
              },
            } as any}
          />
        </View>

        {/* Ride history — filtered to selected calendar day */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>
            {selectedDate === todayStr()
              ? `Today's ${profile.activeSport === 'running' ? 'Runs' : 'Rides'}`
              : `${profile.activeSport === 'running' ? 'Runs' : 'Rides'} on ${format(parseISO(selectedDate), 'MMM d')}`}
          </Text>
          {selectedDate !== todayStr() && (
            <TouchableOpacity onPress={() => setSelectedDate(todayStr())}>
              <Text style={styles.resetDate}>Today →</Text>
            </TouchableOpacity>
          )}
        </View>
        {dayRides.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {selectedDate === todayStr()
                ? profile.activeSport === 'running' ? 'No runs today. Hit the pavement!' : 'No rides today. Get on the bike!'
                : `No ${profile.activeSport === 'running' ? 'runs' : 'rides'} on this day.`}
            </Text>
          </View>
        )}
        {dayRides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            unit={profile.distanceUnit}
            sport={(profile.activeSport ?? 'cycling') as 'cycling' | 'running'}
            onDelete={deleteRide}
            onPress={setSelectedRide}
          />
        ))}

        {/* AI Reflection */}
        {session && (
          <>
            <Text style={styles.sectionTitle}>Reflection</Text>

            {/* Period toggle */}
            <View style={styles.periodRow}>
              {(['weekly', 'monthly'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, reflectionPeriod === p && styles.periodBtnActive]}
                  onPress={() => setReflectionPeriod(p)}
                >
                  <Text style={[styles.periodText, reflectionPeriod === p && styles.periodTextActive]}>
                    {p === 'weekly' ? 'Last 7 days' : 'Last 30 days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeReflection ? (
              <InsightCard insight={activeReflection.content} />
            ) : null}

            <TouchableOpacity
              style={[
                styles.generateBtn,
                (reflectionLoading || !canRegenerate) && styles.generateBtnLoading,
              ]}
              onPress={handleGenerateReflection}
              disabled={reflectionLoading || !canRegenerate}
            >
              <Text style={styles.generateBtnText}>
                {reflectionLoading
                  ? 'Generating...'
                  : activeReflection
                    ? canRegenerate ? 'Regenerate' : 'Come back tomorrow'
                    : 'Generate Reflection'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <RideDetailModal
        ride={selectedRide}
        unit={profile.distanceUnit}
        sport={(profile.activeSport ?? 'cycling') as 'cycling' | 'running'}
        onDismiss={() => setSelectedRide(null)}
        onUpdateRide={updateRide}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  pageTitle: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },

  streakRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  streakCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakVal: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
  },
  streakLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },

  prRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  prCard: {
    flex: 1,
    minWidth: 90,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.record + '40',
  },
  prIcon: { fontSize: 20, marginBottom: 2 },
  prVal: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.record,
  },
  prLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  moodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  moodCorrelation: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  moodCorrelationHighlight: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
  },
  moodProgress: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  moodDistRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  moodDistItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moodDistEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  moodDistCount: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textSecondary,
  },

  chartModeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.medium,
  },
  modeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
  },

  chartWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  calendarWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  resetDate: {
    fontSize: FONT.size.xs,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  empty: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
  },

  periodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  periodText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
  },

  generateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  generateBtnLoading: {
    opacity: 0.6,
  },
  generateBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.white,
  },

  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  emptyBody: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
