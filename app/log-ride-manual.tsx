import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '@/constants/theme';
import { calcCurrentStreak } from '@/utils/streaks';
import { sendStreakCelebration } from '@/utils/notifications';
import { celebrationSignal } from '@/utils/celebrationSignal';
import { challengeCompleteSignal } from '@/utils/challengeCompleteSignal';

interface FormState {
  duration: string;
  distance: string;
  calories: string;
  resistance: string;
  avgHeartRate: string;
  instructor: string;
  notes: string;
}

export default function LogRideScreen() {
  const { data, sportData, addRideOnDate } = useApp();
  const distanceUnit = data.profile.distanceUnit;
  const activeSport = data.profile.activeSport ?? 'cycling';

  const MOOD_OPTS = [
    { v: 1 as const, emoji: '😴', label: 'Wiped' },
    { v: 2 as const, emoji: '😕', label: 'Meh' },
    { v: 3 as const, emoji: '😊', label: 'Good' },
    { v: 4 as const, emoji: '😄', label: 'Great' },
    { v: 5 as const, emoji: '🔥', label: 'On Fire' },
  ];

  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [form, setForm] = useState<FormState>({
    duration: '',
    distance: '',
    calories: '',
    resistance: '',
    avgHeartRate: '',
    instructor: '',
    notes: '',
  });
  const [rideDate, setRideDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      // Preserve existing time when changing date
      const next = new Date(selected);
      next.setHours(rideDate.getHours(), rideDate.getMinutes(), 0, 0);
      setRideDate(next);
    }
  }

  function onTimeChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      const next = new Date(rideDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setRideDate(next);
    }
  }

  async function handleLog() {
    const duration = parseInt(form.duration, 10);
    if (!duration || duration <= 0) {
      setError('Please enter a valid duration.');
      return;
    }
    setError('');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    let distanceKm: number | undefined;
    if (form.distance) {
      const raw = parseFloat(form.distance);
      distanceKm = distanceUnit === 'miles' ? raw / 0.621371 : raw;
    }

    const result = await addRideOnDate({
      date: rideDate.toISOString(),
      duration,
      distance: distanceKm,
      calories: form.calories ? parseInt(form.calories, 10) : undefined,
      resistance: form.resistance ? parseInt(form.resistance, 10) : undefined,
      avgHeartRate: form.avgHeartRate ? parseInt(form.avgHeartRate, 10) : undefined,
      instructor: form.instructor || undefined,
      notes: form.notes || undefined,
      mood: selectedMood,
    });

    if (result.completedChallenges.length > 0) {
      challengeCompleteSignal.ids = result.completedChallenges;
    }
    celebrationSignal.pending = true;

    const newStreak = calcCurrentStreak([
      { id: 'tmp', date: rideDate.toISOString(), duration },
      ...sportData.rides,
    ]);
    if (data.notifications.streakCelebrations && newStreak > 0 && newStreak % 5 === 0) {
      sendStreakCelebration(newStreak);
    }

    router.back();
  }

  const isToday = format(rideDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const dateLabel = isToday ? 'Today' : format(rideDate, 'MMM d, yyyy');
  const timeLabel = format(rideDate, 'h:mm a');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Manually</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date & Time */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Date & Time</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.datePill, styles.dateBtn]}
                onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
                activeOpacity={0.7}
              >
                <Text style={styles.datePillText}>{dateLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePill, styles.timeBtn]}
                onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                activeOpacity={0.7}
              >
                <Text style={styles.datePillText}>{timeLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* iOS inline pickers */}
          {Platform.OS === 'ios' && (
            <>
              {showDatePicker && (
                <Modal transparent animationType="slide">
                  <View style={styles.pickerOverlay}>
                    <View style={styles.pickerSheet}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.pickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={rideDate}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date()}
                        onChange={onDateChange}
                        themeVariant="dark"
                      />
                    </View>
                  </View>
                </Modal>
              )}
              {showTimePicker && (
                <Modal transparent animationType="slide">
                  <View style={styles.pickerOverlay}>
                    <View style={styles.pickerSheet}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={styles.pickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={rideDate}
                        mode="time"
                        display="spinner"
                        onChange={onTimeChange}
                        themeVariant="dark"
                      />
                    </View>
                  </View>
                </Modal>
              )}
            </>
          )}

          {/* Android: native dialog */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={rideDate}
              mode="date"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={rideDate}
              mode="time"
              onChange={onTimeChange}
            />
          )}

          {/* Duration */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>
              Duration<Text style={{ color: COLORS.record }}> *</Text>
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.duration}
                onChangeText={set('duration')}
                placeholder="45"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <Text style={styles.unit}>min</Text>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Distance</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.distance}
                onChangeText={set('distance')}
                placeholder={distanceUnit === 'miles' ? '9.3' : '15.0'}
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <Text style={styles.unit}>{distanceUnit === 'miles' ? 'mi' : 'km'}</Text>
            </View>
          </View>

          {/* Calories */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Calories</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.calories}
                onChangeText={set('calories')}
                placeholder="350"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <Text style={styles.unit}>kcal</Text>
            </View>
          </View>

          {/* Resistance — cycling only */}
          {activeSport === 'cycling' && (
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Resistance</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={form.resistance}
                  onChangeText={set('resistance')}
                  placeholder="7"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
                <Text style={styles.unit}>/10</Text>
              </View>
            </View>
          )}

          {/* Avg HR */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Avg HR</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.avgHeartRate}
                onChangeText={set('avgHeartRate')}
                placeholder="145"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <Text style={styles.unit}>bpm</Text>
            </View>
          </View>

          {/* Instructor — cycling only */}
          {activeSport === 'cycling' && (
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Instructor</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={form.instructor}
                  onChangeText={set('instructor')}
                  placeholder="e.g. Alex"
                  placeholderTextColor={COLORS.textTertiary}
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.notes}
                onChangeText={set('notes')}
                placeholder="How did it feel?"
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Mood */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>How did it feel?</Text>
            <View style={styles.moodRow}>
              {MOOD_OPTS.map((opt) => (
                <TouchableOpacity
                  key={opt.v}
                  style={[styles.moodBtn, selectedMood === opt.v && styles.moodBtnActive]}
                  onPress={() => setSelectedMood(selectedMood === opt.v ? undefined : opt.v)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.moodLabel, selectedMood === opt.v && styles.moodLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error !== '' && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        {/* Log button */}
        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
            <TouchableOpacity onPress={handleLog} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.primary, '#00A882']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.logBtn, SHADOW.primary]}
              >
                <Text style={styles.logBtnText}>Log It!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
  closeText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  fieldWrap: { marginBottom: SPACING.md },
  fieldLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT.size.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm + 2,
    minHeight: 44,
  },
  unit: {
    fontSize: FONT.size.sm,
    color: COLORS.textTertiary,
    marginLeft: SPACING.xs,
  },

  dateRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  datePill: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBtn: { flex: 1.4 },
  timeBtn: { flex: 1 },
  datePillText: {
    fontSize: FONT.size.md,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.medium,
  },

  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xxl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerDone: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  moodRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moodBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.medium,
  },
  moodLabelActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
  },

  error: {
    color: COLORS.record,
    fontSize: FONT.size.sm,
    marginBottom: SPACING.sm,
  },

  footer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
  },
  logBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  logBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
});
