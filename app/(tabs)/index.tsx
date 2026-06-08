import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { Audio } from 'expo-av';
import { useApp } from '@/context/AppContext';
import { calcCurrentStreak } from '@/utils/streaks';
import { ridesThisWeek } from '@/utils/streaks';
import { formatDuration, greetingForHour } from '@/utils/format';
import { StatCard } from '@/components/StatCard';
import { RideCard } from '@/components/RideCard';
import { RideDetailModal } from '@/components/RideDetailModal';
import { WeeklyRing } from '@/components/WeeklyRing';
import { StreakBadge } from '@/components/StreakBadge';
import { CycleTrack } from '@/components/CycleTrack';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { LevelUpModal } from '@/components/LevelUpModal';
import { ChallengeCompleteModal } from '@/components/ChallengeCompleteModal';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '@/constants/theme';
import { celebrationSignal } from '@/utils/celebrationSignal';
import { challengeCompleteSignal } from '@/utils/challengeCompleteSignal';
import { LEVEL_BADGE_DEFS, LevelBadgeDef } from '@/constants/levelBadges';
import { Ride } from '@/types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { data, loaded, session } = useApp();
  const { rides, profile, achievements } = data;
  const navState = useRootNavigationState();

  // Auth + onboarding routing — gate on navigator being mounted AND data loaded
  React.useEffect(() => {
    if (!navState?.key || !loaded) return;
    if (!session) {
      router.replace('/auth');
    } else if (!data.hasSeenOnboarding) {
      router.replace('/onboarding');
    }
  }, [navState?.key, loaded, session, data.hasSeenOnboarding]);

  const [isFocused, setIsFocused] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [completedChallengeId, setCompletedChallengeId] = useState<string | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; badge?: LevelBadgeDef } | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  function handleLevelUp(newLevel: number) {
    const badge = LEVEL_BADGE_DEFS.find((b) => b.unlocksAtLevel === newLevel);
    setLevelUpInfo({ level: newLevel, badge });
    playLevelUpSound();
  }

  // Called when the confetti ends OR when there's no celebration on focus.
  // Starts the CycleTrack animation — unless a challenge popup needs to show first.
  function startTrackOrShowChallenge() {
    if (challengeCompleteSignal.ids.length > 0) {
      const id = challengeCompleteSignal.ids.shift()!;
      challengeCompleteSignal.ids = [];
      setCompletedChallengeId(id);
      playChallengeSound();
    } else {
      setIsFocused(true);
    }
  }

  const soundRef         = useRef<Audio.Sound | null>(null);
  const levelUpSoundRef  = useRef<Audio.Sound | null>(null);
  const challengeSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      levelUpSoundRef.current?.unloadAsync();
      challengeSoundRef.current?.unloadAsync();
    };
  }, []);

  async function playTrumpet() {
    try {
      soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/triumph.mp3')
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  }

  async function playLevelUpSound() {
    try {
      levelUpSoundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/triumph.mp3')
      );
      levelUpSoundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  }

  async function playChallengeSound() {
    try {
      challengeSoundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/triumph.mp3')
      );
      challengeSoundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  }

  useFocusEffect(
    useCallback(() => {
      if (celebrationSignal.pending) {
        celebrationSignal.pending = false;
        setTimeout(() => {
          setCelebrating(true);
          playTrumpet();
        }, 350);
        // isFocused is set after confetti ends (and after challenge popup if any)
      } else {
        startTrackOrShowChallenge();
      }
      return () => setIsFocused(false);
    }, [])
  );

  const streak = calcCurrentStreak(rides);
  const weekRides = ridesThisWeek(rides);
  const totalMinutes = rides.reduce((s, r) => s + r.duration, 0);
  const totalKm = rides.reduce((s, r) => s + (r.distance ?? 0), 0);
  const totalMiles = totalKm * 0.621371;
  const totalCal = rides.reduce((s, r) => s + (r.calories ?? 0), 0);
  const earnedCount = achievements.filter((a) => a.earned).length;
  const recentRides = rides.slice(0, 5);
  const greeting = greetingForHour(new Date().getHours());

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{profile.name} 👋</Text>
          </View>
          {streak > 0 && <StreakBadge streak={streak} size="sm" />}
        </View>

        {/* Hero log button */}
        <TouchableOpacity
          style={styles.logBtnWrap}
          onPress={() => router.push('/log-ride')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, '#00A882']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.logBtn, SHADOW.primary]}
          >
            <Text style={styles.logIcon}>🚴</Text>
            <Text style={styles.logText}>Log a Ride</Text>
            <Text style={styles.logArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Weekly + streak row */}
        <View style={styles.weekRow}>
          <View style={styles.ringWrap}>
            <WeeklyRing
              completed={weekRides.length}
              goal={profile.weeklyRideGoal}
              size={110}
            />
          </View>
          <View style={styles.weekStats}>
            <View style={styles.weekStatItem}>
              <Text style={styles.weekStatVal}>
                {weekRides.reduce((s, r) => s + r.duration, 0)}
              </Text>
              <Text style={styles.weekStatLabel}>mins this week</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.weekStatItem}>
              <Text style={[styles.weekStatVal, { color: COLORS.streak }]}>{streak}</Text>
              <Text style={styles.weekStatLabel}>day streak 🔥</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.weekStatItem}>
              <Text style={[styles.weekStatVal, { color: COLORS.achievement }]}>{earnedCount}</Text>
              <Text style={styles.weekStatLabel}>achievements</Text>
            </View>
          </View>
        </View>

        {/* Cycle level track */}
        <Text style={styles.sectionTitle}>Cycle Level</Text>
        <View style={styles.trackWrap}>
          <CycleTrack totalMiles={totalMiles} focused={isFocused} onLevelUp={handleLevelUp} />
        </View>

        {/* All-time stats */}
        <Text style={styles.sectionTitle}>All-Time Stats</Text>
        <View style={styles.statsRow}>
          <StatCard
            label="Rides"
            value={String(rides.length)}
            icon="🚴"
            accent={COLORS.primary}
          />
          <StatCard
            label="Time"
            value={formatDuration(totalMinutes)}
            icon="⏱️"
            accent={COLORS.blue}
          />
        </View>
        <View style={[styles.statsRow, { marginTop: SPACING.sm }]}>
          <StatCard
            label="Distance"
            value={`${totalKm.toFixed(0)} km`}
            icon="🗺️"
            accent={COLORS.streak}
          />
          <StatCard
            label="Calories"
            value={totalCal > 0 ? `${totalCal.toLocaleString()}` : '—'}
            icon="🔥"
            accent={COLORS.record}
          />
        </View>

        {/* Recent rides */}
        {recentRides.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Rides</Text>
            {recentRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                unit={profile.distanceUnit}
                onPress={setSelectedRide}
              />
            ))}
            {rides.length > 5 && (
              <TouchableOpacity onPress={() => router.push('/stats')}>
                <Text style={styles.seeAll}>See all {rides.length} rides →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {recentRides.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚲</Text>
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptySub}>Tap "Log a Ride" to get started!</Text>
          </View>
        )}
      </ScrollView>

      <CelebrationOverlay
        visible={celebrating}
        onDone={() => {
          setCelebrating(false);
          startTrackOrShowChallenge();
        }}
      />

      <ChallengeCompleteModal
        visible={completedChallengeId !== null}
        challengeId={completedChallengeId ?? ''}
        onDismiss={() => {
          setCompletedChallengeId(null);
          setIsFocused(true);
        }}
      />

      <LevelUpModal
        visible={levelUpInfo !== null}
        level={levelUpInfo?.level ?? 1}
        badge={levelUpInfo?.badge}
        onDismiss={() => setLevelUpInfo(null)}
      />

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  greeting: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
  },

  logBtnWrap: { marginBottom: SPACING.lg },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  logIcon: { fontSize: 28 },
  logText: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  logArrow: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.black,
    opacity: 0.7,
  },

  weekRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.md,
  },
  ringWrap: { alignItems: 'center' },
  weekStats: { flex: 1, gap: SPACING.sm },
  weekStatItem: {},
  weekStatVal: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
  },
  weekStatLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
    letterSpacing: 0.2,
  },
  trackWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  seeAll: {
    color: COLORS.primary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
});
