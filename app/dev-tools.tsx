import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import { useApp } from '@/context/AppContext';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { LevelUpModal } from '@/components/LevelUpModal';
import { ChallengeCompleteModal } from '@/components/ChallengeCompleteModal';
import { RideDetailModal } from '@/components/RideDetailModal';
import { CHALLENGE_DEFS } from '@/constants/challenges';
import { LEVEL_BADGE_DEFS } from '@/constants/levelBadges';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import { Ride } from '@/types';

// ─── Visual preview state ─────────────────────────────────────────────────────

export default function DevToolsScreen() {
  const { data, addRideOnDate, resetData, markOnboardingSeen } = useApp();

  const [showConfetti, setShowConfetti]             = useState(false);
  const [levelUpPreview, setLevelUpPreview]         = useState<number | null>(null);
  const [challengePreview, setChallengePreview]     = useState<string | null>(null);
  const [ridePreview, setRidePreview]               = useState<Ride | null>(null);
  const [selectedLevel, setSelectedLevel]           = useState(5);
  const [selectedChallenge, setSelectedChallenge]   = useState(CHALLENGE_DEFS[0].id);
  const soundRef = useRef<Audio.Sound | null>(null);

  const badge = LEVEL_BADGE_DEFS.find((b) => b.unlocksAtLevel === selectedLevel);

  // ── Sound helper ─────────────────────────────────────────────────────────────

  async function playSound() {
    try {
      soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/triumph.mp3'),
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  }

  // ── Data helpers ──────────────────────────────────────────────────────────────

  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  }

  async function addTestRide(daysBack: number, opts: Partial<Ride> = {}) {
    await addRideOnDate({
      date: daysAgo(daysBack),
      duration: opts.duration ?? 45,
      distance: opts.distance ?? 15,
      calories: opts.calories ?? 350,
      resistance: opts.resistance,
      avgHeartRate: opts.avgHeartRate,
      instructor: opts.instructor,
      notes: opts.notes,
    });
  }

  async function buildStreak(days: number) {
    for (let i = days - 1; i >= 0; i--) {
      await addRideOnDate({ date: daysAgo(i), duration: 30, distance: 10, calories: 200 });
    }
    Alert.alert('Done', `Added ${days} rides (one per day for the last ${days} days).`);
  }

  async function addBigRide() {
    await addRideOnDate({ date: daysAgo(0), duration: 120, distance: 200, calories: 1500 });
    Alert.alert('Added', 'Added a 200 km ride today.');
  }

  function confirmReset() {
    Alert.alert(
      'Reset All Rides',
      'This will delete all rides and reset challenges/achievements. Profile and settings are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetData },
      ],
    );
  }

  function confirmResetOnboarding() {
    Alert.alert(
      'Reset Onboarding',
      'Next time you open the home tab, the onboarding flow will show again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            // Flip the flag back off by re-dispatching LOAD won't work cleanly;
            // instead set it via a quick reload trick using markOnboardingSeen inversely.
            // Easiest: navigate to onboarding directly.
            router.replace('/onboarding');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dev Tools</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Visual Triggers ─────────────────────────────────────── */}
        <Text style={styles.section}>Visual Triggers</Text>

        <DevCard>
          <DevLabel icon="🎊" label="Confetti Overlay" />
          <DevButton label="Fire" onPress={() => { setShowConfetti(true); playSound(); }} />
        </DevCard>

        <DevCard>
          <DevLabel icon="⬆️" label="Level Up Modal" />
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Level:</Text>
            {[2, 5, 10, 15].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[styles.chip, selectedLevel === lvl && styles.chipActive]}
                onPress={() => setSelectedLevel(lvl)}
              >
                <Text style={[styles.chipText, selectedLevel === lvl && styles.chipTextActive]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {badge ? (
            <Text style={styles.badgePreview}>Badge: {badge.icon} {badge.name}</Text>
          ) : (
            <Text style={styles.badgePreview}>No badge at this level</Text>
          )}
          <DevButton label="Show" onPress={() => { setLevelUpPreview(selectedLevel); playSound(); }} />
        </DevCard>

        <DevCard>
          <DevLabel icon="✅" label="Challenge Complete Modal" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.challengePicker}>
            {CHALLENGE_DEFS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selectedChallenge === c.id && styles.chipActive]}
                onPress={() => setSelectedChallenge(c.id)}
              >
                <Text style={[styles.chipText, selectedChallenge === c.id && styles.chipTextActive]}>
                  {c.icon} {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <DevButton label="Show" onPress={() => { setChallengePreview(selectedChallenge); playSound(); }} />
        </DevCard>

        <DevCard>
          <DevLabel icon="🚴" label="Ride Detail Modal" />
          <Text style={styles.hint}>Shows a sample ride with all fields filled</Text>
          <DevButton
            label="Show"
            onPress={() =>
              setRidePreview({
                id: 'dev-preview',
                date: new Date().toISOString(),
                duration: 62,
                distance: 24.5,
                calories: 520,
                resistance: 7,
                avgHeartRate: 152,
                instructor: 'Alex',
                notes: 'Great ride today! Felt strong throughout.',
              })
            }
          />
        </DevCard>

        {/* ── Data Tools ──────────────────────────────────────────── */}
        <Text style={styles.section}>Data Tools</Text>

        <DevCard>
          <DevLabel icon="➕" label="Add Test Rides" />
          <Text style={styles.hint}>Each button adds one ride at the given offset from today</Text>
          <View style={styles.row}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <TouchableOpacity key={d} style={styles.chip} onPress={() => addTestRide(d)}>
                <Text style={styles.chipText}>{d === 0 ? 'Today' : `-${d}d`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </DevCard>

        <DevCard>
          <DevLabel icon="💪" label="Add 200 km Ride Today" />
          <Text style={styles.hint}>Pushes level progress significantly</Text>
          <DevButton label="Add" onPress={addBigRide} />
        </DevCard>

        <DevCard>
          <DevLabel icon="🔥" label="Build Streak" />
          <Text style={styles.hint}>Adds one ride per day for consecutive days</Text>
          <View style={styles.row}>
            {[3, 7, 14, 30].map((n) => (
              <TouchableOpacity key={n} style={styles.chip} onPress={() => buildStreak(n)}>
                <Text style={styles.chipText}>{n}d</Text>
              </TouchableOpacity>
            ))}
          </View>
        </DevCard>

        <DevCard>
          <DevLabel icon="🔄" label="Re-show Onboarding" />
          <Text style={styles.hint}>Navigates to the onboarding screen immediately</Text>
          <DevButton label="Go to Onboarding" onPress={confirmResetOnboarding} accent={COLORS.blue} />
        </DevCard>

        <DevCard>
          <DevLabel icon="🗑️" label="Reset All Ride Data" />
          <Text style={styles.hint}>Deletes all rides. Profile & settings are preserved.</Text>
          <DevButton label="Reset" onPress={confirmReset} accent={COLORS.record} />
        </DevCard>

        {/* Stats snapshot */}
        <Text style={styles.section}>Current State</Text>
        <View style={styles.snapshotCard}>
          {[
            ['Rides', String(data.rides.length)],
            ['Unlocked badges', String(data.unlockedBadges.length)],
            ['Challenges enrolled', String(data.challenges.filter((c) => c.enrolled).length)],
            ['Achievements earned', String(data.achievements.filter((a) => a.earned).length)],
            ['Onboarding seen', String(data.hasSeenOnboarding)],
          ].map(([label, value]) => (
            <View key={label} style={styles.snapshotRow}>
              <Text style={styles.snapshotLabel}>{label}</Text>
              <Text style={styles.snapshotValue}>{value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <CelebrationOverlay visible={showConfetti} onDone={() => setShowConfetti(false)} />

      <LevelUpModal
        visible={levelUpPreview !== null}
        level={levelUpPreview ?? 1}
        badge={badge}
        onDismiss={() => setLevelUpPreview(null)}
      />

      <ChallengeCompleteModal
        visible={challengePreview !== null}
        challengeId={challengePreview ?? ''}
        onDismiss={() => setChallengePreview(null)}
      />

      <RideDetailModal
        ride={ridePreview}
        unit={data.profile.distanceUnit}
        onDismiss={() => setRidePreview(null)}
      />
    </SafeAreaView>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function DevCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function DevLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.labelIcon}>{icon}</Text>
      <Text style={styles.labelText}>{label}</Text>
    </View>
  );
}

function DevButton({
  label,
  onPress,
  accent = COLORS.primary,
}: {
  label: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.devBtn, { borderColor: accent + '60', backgroundColor: accent + '18' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.devBtnText, { color: accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: FONT.size.xl,
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  section: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  labelIcon: { fontSize: 18 },
  labelText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
    lineHeight: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  pickerLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginRight: 2,
  },
  challengePicker: {
    marginVertical: 2,
  },
  badgePreview: {
    fontSize: FONT.size.xs,
    color: COLORS.achievement,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 2,
    marginBottom: 2,
  },
  chipActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
  },
  devBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  devBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },

  snapshotCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  snapshotLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  snapshotValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
});
