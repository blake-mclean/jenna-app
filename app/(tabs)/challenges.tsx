import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { ChallengeCard } from '@/components/ChallengeCard';
import { AchievementBadge } from '@/components/AchievementBadge';
import { CHALLENGE_DEFS } from '@/constants/challenges';
import { ACHIEVEMENT_DEFS } from '@/constants/achievements';
import { RUNNING_CHALLENGE_DEFS } from '@/constants/runningChallenges';
import { RUNNING_ACHIEVEMENT_DEFS } from '@/constants/runningAchievements';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';
import { Icon } from '@/components/Icon';

type Tab = 'challenges' | 'achievements';

export default function ChallengesScreen() {
  const { data, sportData, enrollChallenge, unenrollChallenge } = useApp();
  const { challenges, achievements } = sportData;
  const [tab, setTab] = useState<Tab>('challenges');

  const activeSport = data.profile.activeSport ?? 'cycling';
  const ACTIVE_CHALLENGE_DEFS = activeSport === 'running' ? RUNNING_CHALLENGE_DEFS : CHALLENGE_DEFS;
  const ACTIVE_ACHIEVEMENT_DEFS = activeSport === 'running' ? RUNNING_ACHIEVEMENT_DEFS : ACHIEVEMENT_DEFS;

  const earnedCount = achievements.filter((a) => a.earned).length;
  const activeCount = challenges.filter((c) => c.enrolled && !c.completed).length;

  const inProgressDefs = ACTIVE_CHALLENGE_DEFS.filter((d) => {
    const s = challenges.find((c) => c.id === d.id);
    return s?.enrolled && !s.completed;
  });
  const completedDefs = ACTIVE_CHALLENGE_DEFS.filter((d) =>
    challenges.find((c) => c.id === d.id)?.completed,
  );
  const availableDefs = ACTIVE_CHALLENGE_DEFS.filter(
    (d) => !challenges.find((c) => c.id === d.id)?.enrolled,
  );

  const earnedDefs = ACTIVE_ACHIEVEMENT_DEFS.filter((d) =>
    achievements.find((a) => a.id === d.id)?.earned,
  );
  const lockedDefs = ACTIVE_ACHIEVEMENT_DEFS.filter(
    (d) => !achievements.find((a) => a.id === d.id)?.earned,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Challenges & Achievements</Text>

          <View style={styles.pillRow}>
            <View style={[styles.pill, styles.pillActive]}>
              <Icon name="lightning" size={16} color={COLORS.primary} />
              <Text style={[styles.pillText, styles.pillTextActive]}>
                {activeCount} active
              </Text>
            </View>
            <View style={[styles.pill, styles.pillEarned]}>
              <Icon name="trophy" size={16} color={COLORS.achievement} />
              <Text style={[styles.pillText, styles.pillTextEarned]}>
                {earnedCount}/{ACTIVE_ACHIEVEMENT_DEFS.length} earned
              </Text>
            </View>
          </View>
        </View>

        {/* Tab toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'challenges' && styles.tabBtnActive]}
            onPress={() => setTab('challenges')}
          >
            <Text style={[styles.tabText, tab === 'challenges' && styles.tabTextActive]}>
              Challenges
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'achievements' && styles.tabBtnActive]}
            onPress={() => setTab('achievements')}
          >
            <Text style={[styles.tabText, tab === 'achievements' && styles.tabTextActive]}>
              Achievements
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── CHALLENGES TAB ─── */}
          {tab === 'challenges' && (
            <>
              {inProgressDefs.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Icon name="lightning" size={14} color={COLORS.primary} />
                    <Text style={[styles.sectionLabel, { color: COLORS.primary }]}>
                      IN PROGRESS
                    </Text>
                  </View>
                  {inProgressDefs.map((def) => (
                    <ChallengeCard
                      key={def.id}
                      def={def}
                      state={challenges.find((c) => c.id === def.id)}
                      onEnroll={enrollChallenge}
                      onUnenroll={unenrollChallenge}
                    />
                  ))}
                </>
              )}

              {completedDefs.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Icon name="check" size={14} color={COLORS.primary} />
                    <Text style={[styles.sectionLabel, { color: COLORS.primary }]}>
                      COMPLETED
                    </Text>
                  </View>
                  {completedDefs.map((def) => (
                    <ChallengeCard
                      key={def.id}
                      def={def}
                      state={challenges.find((c) => c.id === def.id)}
                      onEnroll={enrollChallenge}
                      onUnenroll={unenrollChallenge}
                    />
                  ))}
                </>
              )}

              {availableDefs.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Icon name="list" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.sectionLabel}>ALL CHALLENGES</Text>
                  </View>
                  {availableDefs.map((def) => (
                    <ChallengeCard
                      key={def.id}
                      def={def}
                      state={challenges.find((c) => c.id === def.id)}
                      onEnroll={enrollChallenge}
                      onUnenroll={unenrollChallenge}
                    />
                  ))}
                </>
              )}

              {availableDefs.length === 0 && inProgressDefs.length === 0 && completedDefs.length > 0 && (
                <View style={styles.allDoneWrap}>
                  <Icon name="trophy" size={36} color={COLORS.achievement} />
                  <Text style={styles.allDoneText}>You've completed all challenges!</Text>
                  <Text style={styles.allDoneSub}>Check back — new challenges may be added over time.</Text>
                </View>
              )}

              {availableDefs.length === 0 && inProgressDefs.length > 0 && (
                <View style={styles.enrolledHint}>
                  <Icon name="check" size={14} color={COLORS.primary} />
                  <Text style={styles.enrolledHintText}>You've joined all available challenges — keep going!</Text>
                </View>
              )}
            </>
          )}

          {/* ─── ACHIEVEMENTS TAB ─── */}
          {tab === 'achievements' && (
            <View style={styles.badgeGrid}>
              {earnedDefs.map((def) => (
                <AchievementBadge
                  key={def.id}
                  def={def}
                  earned
                  earnedDate={achievements.find((a) => a.id === def.id)?.earnedDate}
                />
              ))}
              {lockedDefs.map((def) => (
                <AchievementBadge key={def.id} def={def} earned={false} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },

  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    lineHeight: 32,
  },

  pillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  pillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0,212,170,0.06)',
  },
  pillEarned: {
    borderColor: COLORS.achievement,
    backgroundColor: 'rgba(155,109,255,0.06)',
  },
  pillText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },
  pillTextActive: {
    color: COLORS.primary,
  },
  pillTextEarned: {
    color: COLORS.achievement,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: '#0E0E1C',
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#1C1C2E',
  },
  tabText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.bold,
  },

  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: SPACING.sm,
  },

  enrolledHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(0,212,170,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.2)',
  },
  enrolledHintText: {
    fontSize: FONT.size.sm,
    color: COLORS.primary,
    flex: 1,
  },

  allDoneWrap: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  allDoneText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  allDoneSub: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
