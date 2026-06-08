import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { requestNotificationPermission, scheduleDaily } from '@/utils/notifications';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number) {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

export default function SettingsScreen() {
  const { data, updateNotifications } = useApp();
  const { notifications } = data;
  const [saving, setSaving] = useState(false);

  async function toggleNotifications(val: boolean) {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Enable notifications in your device settings to receive ride reminders.',
        );
        return;
      }
    }
    const updated = { ...notifications, enabled: val };
    updateNotifications({ enabled: val });
    await scheduleDaily(updated);
  }

  async function handleHourChange(hour: number) {
    const updated = { ...notifications, dailyReminderHour: hour };
    updateNotifications({ dailyReminderHour: hour });
    if (notifications.enabled) {
      await scheduleDaily(updated);
    }
  }

  function toggleStreakCelebrations(val: boolean) {
    updateNotifications({ streakCelebrations: val });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Notifications section */}
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🔔</Text>
              <View>
                <Text style={styles.rowLabel}>Daily Reminders</Text>
                <Text style={styles.rowSub}>Remind me to log my ride</Text>
              </View>
            </View>
            <Switch
              value={notifications.enabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {notifications.enabled && (
            <>
              <View style={styles.separator} />
              <Text style={styles.subLabel}>Reminder Time</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.hourScroll}
              >
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourBtn,
                      notifications.dailyReminderHour === h && styles.hourBtnActive,
                    ]}
                    onPress={() => handleHourChange(h)}
                  >
                    <Text
                      style={[
                        styles.hourText,
                        notifications.dailyReminderHour === h && styles.hourTextActive,
                      ]}
                    >
                      {hourLabel(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🔥</Text>
              <View>
                <Text style={styles.rowLabel}>Streak Celebrations</Text>
                <Text style={styles.rowSub}>Get notified on milestone streaks</Text>
              </View>
            </View>
            <Switch
              value={notifications.streakCelebrations}
              onValueChange={toggleStreakCelebrations}
              trackColor={{ false: COLORS.border, true: COLORS.streak }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* About section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          {[
            { icon: '🚴', label: 'App', value: 'JENNA' },
            { icon: '📱', label: 'Version', value: '1.0.0' },
            { icon: '💾', label: 'Storage', value: 'Local device only' },
          ].map((item) => (
            <View key={item.label} style={styles.aboutRow}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <Text style={styles.aboutLabel}>{item.label}</Text>
              <Text style={styles.aboutValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { paddingVertical: 8 },
  backText: {
    fontSize: FONT.size.md,
    color: COLORS.primary,
    fontWeight: FONT.weight.medium,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  sectionTitle: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  rowIcon: { fontSize: 22 },
  rowLabel: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
  },
  rowSub: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },

  subLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  hourScroll: { marginTop: 4 },
  hourBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hourBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  hourText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    whiteSpace: 'nowrap',
  } as any,
  hourTextActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 6,
  },
  aboutLabel: {
    flex: 1,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  aboutValue: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.medium,
  },
});
