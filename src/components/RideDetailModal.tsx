import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Ride } from '../types';
import { formatDuration, formatDate, formatTime } from '../utils/format';
import { COLORS, SPACING, FONT, RADIUS } from '../constants/theme';

interface Props {
  ride: Ride | null;
  unit: 'km' | 'miles';
  onDismiss: () => void;
}

interface StatRowProps {
  icon: string;
  label: string;
  value: string;
  accent?: string;
}

function StatRow({ icon, label, value, accent }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLeft}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text>
    </View>
  );
}

export function RideDetailModal({ ride, unit, onDismiss }: Props) {
  const slideAnim  = useRef(new Animated.Value(600)).current;
  const bgOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ride) return;
    slideAnim.setValue(600);
    bgOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ride]);

  function dismiss() {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
    ]).start(onDismiss);
  }

  if (!ride) return null;

  const distanceText = ride.distance
    ? unit === 'miles'
      ? `${(ride.distance * 0.621371).toFixed(2)} mi`
      : `${ride.distance.toFixed(2)} km`
    : null;

  return (
    <Modal
      visible={ride !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={dismiss} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Text style={styles.headerIcon}>🚴</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.rideTitle}>{formatDuration(ride.duration)} Ride</Text>
              <Text style={styles.rideDate}>
                {formatDate(ride.date)} · {formatTime(ride.date)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.statsCard}>
              <StatRow
                icon="⏱️"
                label="Duration"
                value={formatDuration(ride.duration)}
                accent={COLORS.blue}
              />
              {distanceText && (
                <StatRow
                  icon="🗺️"
                  label="Distance"
                  value={distanceText}
                  accent={COLORS.streak}
                />
              )}
              {ride.calories != null && (
                <StatRow
                  icon="🔥"
                  label="Calories"
                  value={`${ride.calories.toLocaleString()} kcal`}
                  accent={COLORS.record}
                />
              )}
              {ride.resistance != null && (
                <StatRow
                  icon="💪"
                  label="Resistance"
                  value={`${ride.resistance} / 10`}
                  accent={COLORS.primary}
                />
              )}
              {ride.avgHeartRate != null && (
                <StatRow
                  icon="❤️"
                  label="Avg Heart Rate"
                  value={`${ride.avgHeartRate} bpm`}
                  accent={COLORS.record}
                />
              )}
              {ride.instructor && (
                <StatRow
                  icon="🎤"
                  label="Instructor"
                  value={ride.instructor}
                />
              )}
            </View>

            {ride.notes ? (
              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{ride.notes}</Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.textTertiary,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { fontSize: 22 },
  headerText: { flex: 1 },
  rideTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
  },
  rideDate: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  scroll: { flexGrow: 0 },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  statLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  notesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  notesLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});
