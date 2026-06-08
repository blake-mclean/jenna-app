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
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';

type Tab = 'challenges' | 'achievements';

export default function ChallengesScreen() {
  const { data, enrollChallenge, unenrollChallenge } = useApp();
  const { challenges, achievements } = data;
  const [tab, setTab] = useState<Tab>('challenges');

  const earnedCount = achievements.filter((a) => a.earned).length;
  const activeCount = challenges.filter((c) => c.enrolled && !c.completed).length;
  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Challenges & Achievements</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{activeCount} active</Text>
            </View>
            <View style={[styles.pill, styles.pillAchievement]}>
              <Text style={[styles.pillText, styles.pillTextAchievement]}>
                {earnedCount}/{ACHIEVEMENT_DEFS.length} earned
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'challenges' && styles.tabBtnActive]}
            onPress={() => setTab('challenges')}
          >
            <Text style={[styles.tabText, tab === 'challenges' && styles.tabTextActive]}>
              🏆 Challenges
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'achievements' && styles.tabBtnActive]}
            onPress={() => setTab('achievements')}
          >
            <Text style={[styles.tabText, tab === 'achievements' && styles.tabTextActive]}>
              🎖️ Achievements
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'challenges' && (
            <>
              {completedCount > 0 && (
                <Text style={styles.sectionLabel}>✅ Completed ({completedCount})</Text>
              )}
              {CHALLENGE_DEFS.filter((d) => challenges.find((c) => c.id === d.id)?.completed).map((def) => (
                <ChallengeCard
                  key={def.id}
                  def={def}
                  state={challenges.find((c) => c.id === def.id)}
                  onEnroll={enrollChallenge}
                  onUnenroll={unenrollChallenge}
                />
              ))}

              {activeCount > 0 && (
                <Text style={styles.sectionLabel}>⚡ In Progress ({activeCount})</Text>
              )}
              {CHALLENGE_DEFS.filter((d) => {
                const s = challenges.find((c) => c.id === d.id);
                return s?.enrolled && !s.completed;
              }).map((def) => (
                <ChallengeCard
                  key={def.id}
                  def={def}
                  state={challenges.find((c) => c.id === def.id)}
                  onEnroll={enrollChallenge}
                  onUnenroll={unenrollChallenge}
                />
              ))}

              <Text style={styles.sectionLabel}>📋 All Challenges</Text>
              {CHALLENGE_DEFS.filter((d) => !challenges.find((c) => c.id === d.id)?.enrolled).map((def) => (
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

          {tab === 'achievements' && (
            <>
              {earnedCount > 0 && (
                <>
                  <Text style={styles.sectionLabel}>🏅 Earned ({earnedCount})</Text>
                  <View style={styles.badgeGrid}>
                    {ACHIEVEMENT_DEFS.filter((d) => achievements.find((a) => a.id === d.id)?.earned).map((def) => (
                      <AchievementBadge
                        key={def.id}
                        def={def}
                        earned
                        earnedDate={achievements.find((a) => a.id === def.id)?.earnedDate}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.sectionLabel}>
                🔒 Locked ({ACHIEVEMENT_DEFS.length - earnedCount})
              </Text>
              <View style={styles.badgeGrid}>
                {ACHIEVEMENT_DEFS.filter((d) => !achievements.find((a) => a.id === d.id)?.earned).map((def) => (
                  <AchievementBadge key={def.id} def={def} earned={false} />
                ))}
              </View>
            </>
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
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pill: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  pillAchievement: {
    backgroundColor: COLORS.achievementDim,
  },
  pillText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  pillTextAchievement: {
    color: COLORS.achievement,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.surfaceElevated,
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
    padding: SPACING.md,
    paddingTop: 0,
    paddingBottom: SPACING.xxl,
  },

  sectionLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
});
