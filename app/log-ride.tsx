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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '@/constants/theme';
import { calcCurrentStreak } from '@/utils/streaks';
import { sendStreakCelebration } from '@/utils/notifications';
import { celebrationSignal } from '@/utils/celebrationSignal';
import { challengeCompleteSignal } from '@/utils/challengeCompleteSignal';

interface Field {
  label: string;
  key: keyof FormState;
  unit?: string;
  placeholder: string;
  required?: boolean;
}

interface FormState {
  duration: string;
  distance: string;
  calories: string;
  resistance: string;
  avgHeartRate: string;
  instructor: string;
  notes: string;
}

const FIELDS: Field[] = [
  { label: 'Duration', key: 'duration', unit: 'min', placeholder: '45', required: true },
  { label: 'Distance', key: 'distance', unit: 'km', placeholder: '15.0' },
  { label: 'Calories', key: 'calories', unit: 'kcal', placeholder: '350' },
  { label: 'Resistance', key: 'resistance', unit: '/10', placeholder: '7' },
  { label: 'Avg HR', key: 'avgHeartRate', unit: 'bpm', placeholder: '145' },
  { label: 'Instructor', key: 'instructor', placeholder: 'e.g. Alex' },
  { label: 'Notes', key: 'notes', placeholder: 'How did it feel?' },
];

export default function LogRideScreen() {
  const { data, addRide } = useApp();
  const [form, setForm] = useState<FormState>({
    duration: '',
    distance: '',
    calories: '',
    resistance: '',
    avgHeartRate: '',
    instructor: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

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

    const result = await addRide({
      duration,
      distance: form.distance ? parseFloat(form.distance) : undefined,
      calories: form.calories ? parseInt(form.calories, 10) : undefined,
      resistance: form.resistance ? parseInt(form.resistance, 10) : undefined,
      avgHeartRate: form.avgHeartRate ? parseInt(form.avgHeartRate, 10) : undefined,
      instructor: form.instructor || undefined,
      notes: form.notes || undefined,
    });

    if (result.completedChallenges.length > 0) {
      challengeCompleteSignal.ids = result.completedChallenges;
    }
    celebrationSignal.pending = true;

    const newStreak = calcCurrentStreak([
      { id: 'tmp', date: new Date().toISOString(), duration },
      ...data.rides,
    ]);
    if (data.notifications.streakCelebrations && newStreak > 0 && newStreak % 5 === 0) {
      sendStreakCelebration(newStreak);
    }

    router.back();
  }

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
          <Text style={styles.title}>Log a Ride</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.required && <Text style={{ color: COLORS.record }}> *</Text>}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={form[field.key]}
                  onChangeText={set(field.key)}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType={
                    ['duration', 'distance', 'calories', 'resistance', 'avgHeartRate'].includes(field.key)
                      ? 'decimal-pad'
                      : 'default'
                  }
                  returnKeyType="next"
                  multiline={field.key === 'notes'}
                  numberOfLines={field.key === 'notes' ? 3 : 1}
                />
                {field.unit && <Text style={styles.unit}>{field.unit}</Text>}
              </View>
            </View>
          ))}

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
                <Text style={styles.logBtnText}>🚴 Log It!</Text>
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
