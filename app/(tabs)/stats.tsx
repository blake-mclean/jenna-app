import React, { useState, useCallback } from 'react';
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
import { parseISO, format, subDays, eachDayOfInterval } from 'date-fns';

type ChartMode = 'rides' | 'duration' | 'distance';

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function StatsScreen() {
  const { data, deleteRide } = useApp();
  const { rides, profile } = data;
  const [chartMode, setChartMode] = useState<ChartMode>('rides');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Reset to today whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setSelectedDate(todayStr());
    }, [])
  );

  const streak = calcCurrentStreak(rides);
  const longestStreak = calcLongestStreak(rides);
  const totalMinutes = rides.reduce((s, r) => s + r.duration, 0);
  const totalKm = rides.reduce((s, r) => s + (r.distance ?? 0), 0);
  const totalCal = rides.reduce((s, r) => s + (r.calories ?? 0), 0);
  const prs = getPersonalRecords(rides);

  // Rides for the selected calendar day
  const dayRides = rides.filter(
    (r) => format(parseISO(r.date), 'yyyy-MM-dd') === selectedDate
  );

  // Calendar: mark days with rides; highlight the selected day
  const markedDates = rides.reduce<Record<string, any>>((acc, r) => {
    const key = format(parseISO(r.date), 'yyyy-MM-dd');
    acc[key] = { marked: true, dotColor: COLORS.primary };
    return acc;
  }, {});
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: COLORS.primary,
    selectedTextColor: COLORS.black,
    // keep dot visible if there are rides on the selected day
    marked: dayRides.length > 0,
    dotColor: COLORS.black,
  };

  // Last 7 days chart data
  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const chartData = last7.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayRides = rides.filter((r) => format(parseISO(r.date), 'yyyy-MM-dd') === dayStr);
    let value = 0;
    if (chartMode === 'rides') value = dayRides.length;
    else if (chartMode === 'duration') value = dayRides.reduce((s, r) => s + r.duration, 0);
    else value = dayRides.reduce((s, r) => s + (r.distance ?? 0), 0);
    return { label: format(day, 'EEE')[0], value };
  });

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
            <Text style={styles.streakLabel}>Total rides</Text>
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
                <Text style={styles.prLabel}>Longest ride</Text>
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
                {m === 'rides' ? 'Rides' : m === 'duration' ? 'Minutes' : 'km'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chartWrap}>
          <BarChart
            data={chartData}
            color={COLORS.primary}
            unit={chartMode === 'rides' ? '' : chartMode === 'duration' ? 'm' : 'k'}
          />
        </View>

        {/* Calendar */}
        <Text style={styles.sectionTitle}>Ride Calendar</Text>
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
            {selectedDate === todayStr() ? "Today's Rides" : `Rides on ${format(parseISO(selectedDate), 'MMM d')}`}
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
                ? 'No rides today. Get on the bike!'
                : 'No rides on this day.'}
            </Text>
          </View>
        )}
        {dayRides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            unit={profile.distanceUnit}
            onDelete={deleteRide}
            onPress={setSelectedRide}
          />
        ))}
      </ScrollView>

      <RideDetailModal
        ride={selectedRide}
        unit={profile.distanceUnit}
        onDismiss={() => setSelectedRide(null)}
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
});
