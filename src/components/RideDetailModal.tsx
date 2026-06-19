import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ride } from '../types';
import { formatDuration, formatDate, formatTime } from '../utils/format';
import { COLORS, SPACING, FONT, RADIUS } from '../constants/theme';

interface Props {
  ride: Ride | null;
  unit: 'km' | 'miles';
  sport?: 'cycling' | 'running';
  onDismiss: () => void;
  onUpdateRide?: (id: string, patch: Partial<Ride>) => void;
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

const MOOD_OPTS = [
  { v: 1 as const, emoji: '😴' },
  { v: 2 as const, emoji: '😕' },
  { v: 3 as const, emoji: '😊' },
  { v: 4 as const, emoji: '😄' },
  { v: 5 as const, emoji: '🔥' },
] as const;

export function RideDetailModal({ ride, unit, sport = 'cycling', onDismiss, onUpdateRide }: Props) {
  const slideAnim  = useRef(new Animated.Value(600)).current;
  const bgOpacity  = useRef(new Animated.Value(0)).current;
  const [editingDistance, setEditingDistance] = useState(false);
  const [distanceInput, setDistanceInput] = useState('');
  const [editingMood, setEditingMood] = useState(false);

  useEffect(() => {
    if (!ride) return;
    setEditingDistance(false);
    setEditingMood(false);
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

  const distanceKm = ride.distance ?? 0;
  const distanceText = ride.distance
    ? unit === 'miles'
      ? `${ride.isEstimatedDistance ? '~' : ''}${(distanceKm * 0.621371).toFixed(2)} mi`
      : `${ride.isEstimatedDistance ? '~' : ''}${distanceKm.toFixed(2)} km`
    : null;

  function openDistanceEdit() {
    // Pre-fill in the user's display unit
    const displayVal = unit === 'miles'
      ? (distanceKm * 0.621371).toFixed(2)
      : distanceKm.toFixed(2);
    setDistanceInput(displayVal);
    setEditingDistance(true);
  }

  function saveDistance() {
    const parsed = parseFloat(distanceInput);
    if (!isNaN(parsed) && parsed >= 0 && onUpdateRide && ride) {
      const newKm = unit === 'miles' ? parsed / 0.621371 : parsed;
      onUpdateRide(ride.id, {
        distance: parseFloat(newKm.toFixed(2)),
        isEstimatedDistance: false,
      });
    }
    setEditingDistance(false);
  }

  return (
    <Modal
      visible={ride !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              <Text style={styles.headerIcon}>{sport === 'running' ? '🏃' : '🚴'}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.rideTitle}>{formatDuration(ride.duration)} {sport === 'running' ? 'Run' : 'Ride'}</Text>
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
              {(distanceText || ride.isEstimatedDistance) && (
                editingDistance ? (
                  <View style={styles.editDistanceRow}>
                    <Text style={styles.statIcon}>🗺️</Text>
                    <TextInput
                      style={styles.distanceInput}
                      value={distanceInput}
                      onChangeText={setDistanceInput}
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                    />
                    <Text style={styles.distanceUnit}>{unit}</Text>
                    <TouchableOpacity style={styles.distanceSaveBtn} onPress={saveDistance}>
                      <Text style={styles.distanceSaveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.statRow}>
                    <View style={styles.statLeft}>
                      <Text style={styles.statIcon}>🗺️</Text>
                      <Text style={styles.statLabel}>Distance</Text>
                      {ride.isEstimatedDistance && (
                        <View style={styles.estBadge}>
                          <Text style={styles.estBadgeText}>estimated</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.distanceRight}>
                      <Text style={[styles.statValue, { color: COLORS.streak }]}>{distanceText}</Text>
                      {onUpdateRide && (
                        <TouchableOpacity onPress={openDistanceEdit} hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}>
                          <Text style={styles.editIcon}>✏️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
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
                  icon={sport === 'running' ? '📱' : '🎤'}
                  label={sport === 'running' ? 'Source' : 'Instructor'}
                  value={ride.instructor}
                />
              )}

              {/* Mood — always show when editable; show when set if read-only */}
              {(ride.mood != null || onUpdateRide) && (
                editingMood ? (
                  <View style={styles.moodEditRow}>
                    <Text style={styles.statIcon}>💭</Text>
                    <View style={styles.moodEditOptions}>
                      {MOOD_OPTS.map((opt) => (
                        <TouchableOpacity
                          key={opt.v}
                          style={[styles.moodOptionBtn, ride.mood === opt.v && styles.moodOptionSelected]}
                          onPress={() => {
                            onUpdateRide?.(ride.id, { mood: ride.mood === opt.v ? undefined : opt.v });
                            setEditingMood(false);
                          }}
                        >
                          <Text style={styles.moodOptionEmoji}>{opt.emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity onPress={() => setEditingMood(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                      <Text style={styles.editIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.statRow}>
                    <View style={styles.statLeft}>
                      <Text style={styles.statIcon}>💭</Text>
                      <Text style={styles.statLabel}>Mood</Text>
                    </View>
                    <View style={styles.moodDisplayRight}>
                      <Text style={styles.moodDisplayEmoji}>
                        {ride.mood != null
                          ? MOOD_OPTS.find((o) => o.v === ride.mood)?.emoji ?? '—'
                          : '—'}
                      </Text>
                      {onUpdateRide && (
                        <TouchableOpacity
                          onPress={() => setEditingMood(true)}
                          hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
                        >
                          <Text style={styles.editIcon}>✏️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
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
      </KeyboardAvoidingView>
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
    flex: 1,
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
  distanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  editIcon: { fontSize: 14 },
  estBadge: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  estBadgeText: {
    fontSize: 9,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  distanceInput: {
    flex: 1,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
    textAlign: 'right',
  },
  distanceUnit: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  distanceSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  distanceSaveBtnText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.black,
  },
  moodEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  moodEditOptions: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  moodOptionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moodOptionSelected: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  moodOptionEmoji: {
    fontSize: 18,
  },
  moodDisplayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  moodDisplayEmoji: {
    fontSize: 20,
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
