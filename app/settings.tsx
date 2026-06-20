import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { requestNotificationPermission, scheduleDaily } from '@/utils/notifications';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import { Icon, IconName } from '@/components/Icon';

// ─── Drum wheel picker ────────────────────────────────────────────────────────

const ITEM_H = 48;

function DrumColumn({
  items,
  selectedIndex,
  onSelect,
  width = 72,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  width?: number;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to initial position after layout
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  return (
    <View style={{ width, height: ITEM_H * 5, overflow: 'hidden' }}>
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onSelect(Math.max(0, Math.min(items.length - 1, i)));
        }}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
              onSelect(i);
            }}
          >
            <Text style={[
              drumStyles.item,
              i === selectedIndex && drumStyles.itemSelected,
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Selection highlight band */}
      <View pointerEvents="none" style={drumStyles.band} />
    </View>
  );
}

const drumStyles = StyleSheet.create({
  item: { fontSize: 22, color: COLORS.textTertiary },
  itemSelected: { fontSize: 24, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  band: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: 0,
    right: 0,
    height: ITEM_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    opacity: 0.5,
  },
});

// ─── Time helpers ─────────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPMS   = ['AM', 'PM'];

function to12(h24: number): { h: number; ampm: 0 | 1 } {
  if (h24 === 0)  return { h: 11, ampm: 0 }; // 12 AM → index 11
  if (h24 < 12)   return { h: h24 - 1, ampm: 0 };
  if (h24 === 12) return { h: 11, ampm: 1 }; // 12 PM → index 11
  return { h: h24 - 13, ampm: 1 };
}

function to24(hIdx: number, ampmIdx: number): number {
  const h12 = hIdx + 1; // index 0 = 1, index 11 = 12
  if (ampmIdx === 0) return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function formatTime(h24: number, min: number): string {
  const { h, ampm } = to12(h24);
  const hourDisplay = h + 1;
  return `${hourDisplay}:${String(min).padStart(2, '0')} ${AMPMS[ampm]}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { data, updateNotifications, switchSport, signOut, deleteAccount, session } = useApp();
  const { notifications } = data;
  const activeSport = data.profile.activeSport ?? 'cycling';

  const [showPicker, setShowPicker] = useState(false);

  // Picker drum state (indices)
  const init = to12(notifications.dailyReminderHour ?? 8);
  const [pickerH,     setPickerH]     = useState(init.h);
  const [pickerMin,   setPickerMin]   = useState(notifications.dailyReminderMinute ?? 0);
  const [pickerAmPm,  setPickerAmPm]  = useState<number>(init.ampm);

  function openPicker() {
    const t = to12(notifications.dailyReminderHour ?? 8);
    setPickerH(t.h);
    setPickerMin(notifications.dailyReminderMinute ?? 0);
    setPickerAmPm(t.ampm);
    setShowPicker(true);
  }

  async function confirmTime() {
    const newHour   = to24(pickerH, pickerAmPm);
    const newMinute = pickerMin;
    const updated   = { ...notifications, dailyReminderHour: newHour, dailyReminderMinute: newMinute };
    updateNotifications({ dailyReminderHour: newHour, dailyReminderMinute: newMinute });
    if (notifications.enabled) await scheduleDaily(updated);
    setShowPicker(false);
  }

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
        {/* Sport */}
        <Text style={styles.sectionTitle}>Sport</Text>
        <View style={styles.card}>
          <View style={styles.sportRow}>
            {(['cycling', 'running'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sportBtn, activeSport === s && styles.sportBtnActive]}
                onPress={() => switchSport(s)}
              >
                <Icon name={s === 'cycling' ? 'bicycle' : 'runner'} size={24} color={activeSport === s ? COLORS.primary : COLORS.textTertiary} />
                <Text style={[styles.sportBtnText, activeSport === s && styles.sportBtnTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Icon name="bell" size={20} color={COLORS.textSecondary} />
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
              <View style={styles.timeRow}>
                <Text style={styles.subLabel}>Reminder Time</Text>
                <TouchableOpacity onPress={openPicker} style={styles.timeBtn}>
                  <Text style={styles.timeBtnText}>
                    {formatTime(notifications.dailyReminderHour ?? 8, notifications.dailyReminderMinute ?? 0)}
                  </Text>
                  <Text style={styles.timeBtnChevron}>›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Icon name="flame" size={20} color={COLORS.textSecondary} />
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

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          {[
            { icon: 'bicycle' as IconName, label: 'App', value: 'JENNA' },
            { icon: 'phone' as IconName, label: 'Version', value: '1.0.0' },
          ].map((item) => (
            <View key={item.label} style={styles.aboutRow}>
              <Icon name={item.icon} size={20} color={COLORS.textSecondary} />
              <Text style={styles.aboutLabel}>{item.label}</Text>
              <Text style={styles.aboutValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        {session?.user?.email && (
          <View style={[styles.card, { marginBottom: SPACING.sm }]}>
            <View style={styles.aboutRow}>
              <Icon name="shield" size={20} color={COLORS.textSecondary} />
              <Text style={styles.aboutLabel}>Signed in as</Text>
              <Text style={[styles.aboutValue, { flexShrink: 1 }]} numberOfLines={1}>{session.user.email}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() =>
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
            ])
          }
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={() =>
            Alert.alert(
              'Delete Account',
              'This will permanently delete your account and all your data — rides, achievements, progress, and badges. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: () =>
                    Alert.alert(
                      'Are you absolutely sure?',
                      'Your account will be deleted immediately and cannot be recovered.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete Forever',
                          style: 'destructive',
                          onPress: () => deleteAccount(),
                        },
                      ]
                    ),
                },
              ]
            )
          }
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Reminder Time</Text>
              <TouchableOpacity onPress={confirmTime}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drumRow}>
              <DrumColumn items={HOURS}   selectedIndex={pickerH}     onSelect={setPickerH}    width={72} />
              <Text style={styles.drumColon}>:</Text>
              <DrumColumn items={MINUTES} selectedIndex={pickerMin}   onSelect={setPickerMin}  width={72} />
              <DrumColumn items={AMPMS}   selectedIndex={pickerAmPm}  onSelect={setPickerAmPm} width={64} />
            </View>
          </View>
        </View>
      </Modal>
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
  backText: { fontSize: FONT.size.md, color: COLORS.primary, fontWeight: FONT.weight.medium },
  title: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },

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

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  rowIcon: { fontSize: 22 },
  rowLabel: { fontSize: FONT.size.md, fontWeight: FONT.weight.medium, color: COLORS.textPrimary },
  rowSub: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },

  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  timeBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  timeBtnChevron: { fontSize: FONT.size.lg, color: COLORS.primary, marginTop: -2 },

  sportRow: { flexDirection: 'row', gap: SPACING.sm },
  sportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated ?? COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sportBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  sportBtnIcon: { fontSize: 18 },
  sportBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    color: COLORS.textSecondary,
  },
  sportBtnTextActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
  },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  aboutLabel: { flex: 1, fontSize: FONT.size.sm, color: COLORS.textSecondary },
  aboutValue: { fontSize: FONT.size.sm, color: COLORS.textPrimary, fontWeight: FONT.weight.medium },

  signOutBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.record + '60',
    marginBottom: SPACING.sm,
  },
  signOutText: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.record },

  deleteAccountBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B3060',
    marginBottom: SPACING.xxl,
  },
  deleteAccountText: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: '#FF3B30' },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  modalCancel: { fontSize: FONT.size.md, color: COLORS.textSecondary },
  modalDone: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.primary },

  drumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 4,
  },
  drumColon: {
    fontSize: 28,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
});
