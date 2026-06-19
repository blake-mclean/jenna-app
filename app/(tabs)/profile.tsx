import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { calcCurrentStreak, calcLongestStreak } from '@/utils/streaks';
import { formatDuration } from '@/utils/format';
import { ACHIEVEMENT_DEFS } from '@/constants/achievements';
import { RUNNING_ACHIEVEMENT_DEFS } from '@/constants/runningAchievements';
import { LEVEL_BADGE_DEFS } from '@/constants/levelBadges';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '@/constants/theme';
import { Icon, IconName } from '@/components/Icon';

// margin (md each side) + padding (md each side) + 3 gaps between 4 columns
const BADGE_CARD_W = Math.floor(
  (Dimensions.get('window').width - SPACING.md * 4 - SPACING.sm * 3) / 4
);

export default function ProfileScreen() {
  const { data, sportData, updateProfile, equipBadge } = useApp();
  const { profile } = data;
  const { rides, achievements, unlockedBadges } = sportData;
  const activeSport = profile.activeSport ?? 'cycling';
  const equippedBadge = LEVEL_BADGE_DEFS.find((b) => b.id === profile.equippedBadgeId);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [goalInput, setGoalInput] = useState(String(profile.weeklyRideGoal));
  const [editingGoal, setEditingGoal] = useState(false);

  const isKm = profile.distanceUnit === 'km';
  const indoorSpeedKmh = profile.indoorCyclingSpeed ?? 20;
  const indoorSpeedDisplay = isKm ? indoorSpeedKmh : Math.round(indoorSpeedKmh * 0.621371);
  const speedUnit = isKm ? 'km/h' : 'mph';

  function adjustIndoorSpeed(delta: number) {
    const newDisplay = Math.max(8, Math.min(50, indoorSpeedDisplay + delta));
    const newKmh = isKm ? newDisplay : Math.round(newDisplay / 0.621371);
    updateProfile({ indoorCyclingSpeed: newKmh });
  }

  const streak = calcCurrentStreak(rides);
  const longestStreak = calcLongestStreak(rides);
  const totalMinutes = rides.reduce((s, r) => s + r.duration, 0);
  const totalKm = rides.reduce((s, r) => s + (r.distance ?? 0), 0);
  const earnedAchievements = achievements.filter((a) => a.earned);
  const memberDays = Math.floor(
    (Date.now() - new Date(profile.memberSince).getTime()) / (1000 * 60 * 60 * 24),
  );

  function saveEdit() {
    updateProfile({
      name: nameInput.trim() || profile.name,
      weeklyRideGoal: parseInt(goalInput, 10) || profile.weeklyRideGoal,
    });
    setEditing(false);
  }

  function saveGoal() {
    updateProfile({ weeklyRideGoal: parseInt(goalInput, 10) || profile.weeklyRideGoal });
    setEditingGoal(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[COLORS.primaryDim, COLORS.background]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.avatar, equippedBadge && styles.avatarWithBadge]}>
            {equippedBadge ? (
              <Image source={equippedBadge.image} style={styles.avatarBadgeImg} resizeMode="contain" />
            ) : (
              <Text style={styles.avatarText}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {equippedBadge && (
            <View style={styles.equippedLabel}>
              <Text style={styles.equippedLabelText}>{equippedBadge.name}</Text>
            </View>
          )}
          {editing ? (
            <View style={styles.editWrap}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={COLORS.textTertiary}
                autoFocus
                autoCorrect={false}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={saveEdit}
                onBlur={saveEdit}
              />
            </View>
          ) : (
            <Text style={styles.name}>{profile.name}</Text>
          )}
          <Text style={styles.memberSince}>Member for {memberDays} days</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => (editing ? saveEdit() : setEditing(true))}
          >
            <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: activeSport === 'running' ? 'Total Runs' : 'Total Rides', value: String(rides.length), icon: activeSport === 'running' ? 'runner' : 'bicycle', color: COLORS.primary },
            { label: 'Total Time', value: formatDuration(totalMinutes), icon: 'clock', color: COLORS.blue },
            { label: 'Total Distance', value: profile.distanceUnit === 'miles' ? `${(totalKm * 0.621371).toFixed(0)} mi` : `${totalKm.toFixed(0)} km`, icon: 'route', color: COLORS.streak },
            { label: 'Best Streak', value: `${longestStreak}d`, icon: 'flame', color: COLORS.streak },
            { label: 'Current Streak', value: `${streak}d`, icon: 'lightning', color: COLORS.primary },
            { label: 'Achievements', value: `${earnedAchievements.length}/${activeSport === 'running' ? RUNNING_ACHIEVEMENT_DEFS.length : ACHIEVEMENT_DEFS.length}`, icon: 'medal', color: COLORS.achievement },
          ].map((item) => (
            <View key={item.label} style={styles.statItem}>
              <Icon name={item.icon as IconName} size={20} color={item.color} />
              <Text style={[styles.statVal, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Level Badges */}
        <Text style={styles.sectionTitle}>Level Badges</Text>
        <View style={styles.badgePicker}>
          <Text style={styles.badgeHint}>
            {unlockedBadges.length === 0
              ? `Log ${activeSport === 'running' ? 'runs' : 'rides'} to level up and unlock badges`
              : `Tap a badge to equip it on your profile`}
          </Text>
          <View style={styles.badgeGrid}>
            {LEVEL_BADGE_DEFS.map((def) => {
              const unlocked = unlockedBadges.includes(def.id);
              const equipped = profile.equippedBadgeId === def.id;
              return (
                <TouchableOpacity
                  key={def.id}
                  style={[
                    styles.levelBadgeCard,
                    !unlocked && styles.levelBadgeCardLocked,
                    equipped && styles.levelBadgeCardEquipped,
                  ]}
                  onPress={() => unlocked && equipBadge(equipped ? undefined : def.id)}
                  activeOpacity={unlocked ? 0.7 : 1}
                >
                  {unlocked ? (
                    <Image source={def.image} style={styles.levelBadgeImg} resizeMode="contain" />
                  ) : (
                    <View style={styles.levelBadgeLockWrap}>
                      <Icon name="lock" size={18} color={COLORS.textTertiary} />
                    </View>
                  )}
                  <Text
                    style={[styles.levelBadgeName, !unlocked && styles.levelBadgeNameLocked]}
                    numberOfLines={1}
                  >
                    {unlocked ? def.name : '???'}
                  </Text>
                  <Text style={styles.levelBadgeLevel}>Lvl {def.unlocksAtLevel}</Text>
                  {equipped && <View style={styles.equippedDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weekly goal */}
        <Text style={styles.sectionTitle}>{activeSport === 'running' ? 'Weekly Run Goal' : 'Weekly Ride Goal'}</Text>
        <TouchableOpacity
          style={styles.goalSection}
          onPress={() => { setGoalInput(String(profile.weeklyRideGoal)); setEditingGoal(true); }}
          activeOpacity={editingGoal ? 1 : 0.7}
        >
          {editingGoal ? (
            <View style={styles.goalEditRow}>
              <TextInput
                style={styles.goalTextInput}
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="number-pad"
                maxLength={2}
                autoFocus
              />
              <Text style={styles.goalUnit}>{activeSport === 'running' ? 'runs' : 'rides'} / week</Text>
              <TouchableOpacity style={styles.goalSaveBtn} onPress={saveGoal}>
                <Text style={styles.goalSaveBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.goalDisplay}>
              <Text style={styles.goalVal}>{profile.weeklyRideGoal}</Text>
              <Text style={styles.goalUnit}>{activeSport === 'running' ? 'runs' : 'rides'} per week</Text>
              <Text style={styles.goalEditHint}>Tap to edit</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Indoor cycling speed — cycling only */}
        {activeSport === 'cycling' && (
          <>
            <Text style={styles.sectionTitle}>Indoor Cycling Speed</Text>
            <View style={styles.speedSection}>
              <Text style={styles.speedHint}>Used to estimate distance for indoor rides</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustIndoorSpeed(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{indoorSpeedDisplay} {speedUnit}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustIndoorSpeed(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Distance unit */}
        <Text style={styles.sectionTitle}>Distance Unit</Text>
        <View style={styles.unitSection}>
          <View style={styles.unitRow}>
            {(['km', 'miles'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, profile.distanceUnit === u && styles.unitBtnActive]}
                onPress={() => updateProfile({ distanceUnit: u })}
              >
                <Text
                  style={[styles.unitBtnText, profile.distanceUnit === u && styles.unitBtnTextActive]}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings link */}
        <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/settings')}>
          <Icon name="gear" size={20} color={COLORS.textSecondary} />
          <Text style={styles.settingsLinkText}>Settings & Notifications</Text>
          <Text style={styles.settingsArrow}>→</Text>
        </TouchableOpacity>

        {/* Dev Tools link — dev builds only */}
        {__DEV__ && (
          <TouchableOpacity style={[styles.settingsLink, styles.devLink]} onPress={() => router.push('/dev-tools')}>
            <Icon name="wrench" size={20} color={COLORS.textSecondary} />
            <Text style={[styles.settingsLinkText, styles.devLinkText]}>Developer Tools</Text>
            <Text style={styles.settingsArrow}>→</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  hero: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  avatarText: {
    fontSize: FONT.size.hero * 0.6,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  avatarWithBadge: {
    backgroundColor: '#06060F',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarBadgeImg: {
    width: 72,
    height: 72,
  },
  equippedLabel: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
  },
  equippedLabelText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  name: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  memberSince: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  editWrap: { width: '60%' },
  nameInput: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
    marginBottom: SPACING.xs,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
  },
  editBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statItem: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statVal: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.heavy,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  goalSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs },
  goalVal: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.heavy, color: COLORS.primary },
  goalUnit: { fontSize: FONT.size.sm, color: COLORS.textSecondary },
  goalEditHint: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
    textAlign: 'right',
  },
  goalEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  goalTextInput: {
    width: 60,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
    textAlign: 'center',
  },
  goalSaveBtn: {
    marginLeft: 'auto',
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
  },
  goalSaveBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },

  speedSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedHint: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: SPACING.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
    lineHeight: 22,
  },
  stepValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    minWidth: 64,
    textAlign: 'center',
  },

  unitSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitRow: { flexDirection: 'row', gap: SPACING.sm },
  unitBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  unitBtnText: { fontSize: FONT.size.sm, color: COLORS.textSecondary, fontWeight: FONT.weight.medium },
  unitBtnTextActive: { color: COLORS.primary, fontWeight: FONT.weight.bold },

  badgePicker: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeHint: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  levelBadgeCard: {
    flexBasis: BADGE_CARD_W,
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
    paddingTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  levelBadgeImg: {
    width: BADGE_CARD_W - 8,
    height: BADGE_CARD_W - 8,
    marginBottom: 3,
  },
  levelBadgeLockWrap: {
    width: BADGE_CARD_W - 8,
    height: BADGE_CARD_W - 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  levelBadgeCardLocked: {
    opacity: 0.4,
  },
  levelBadgeCardEquipped: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  levelBadgeIcon: { fontSize: 22, marginBottom: 3 },
  levelBadgeIconLocked: { opacity: 0.6 },
  levelBadgeName: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  levelBadgeNameLocked: { color: COLORS.textSecondary },
  levelBadgeLevel: {
    fontSize: 9,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  equippedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  badgeScroll: { marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.achievementDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginRight: SPACING.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.achievement + '40',
  },
  badgeChipIcon: { fontSize: 14 },
  badgeChipName: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.achievement,
  },

  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  settingsLinkIcon: { fontSize: 20 },
  settingsLinkText: {
    flex: 1,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
  },
  settingsArrow: { fontSize: FONT.size.md, color: COLORS.textSecondary },

  devLink: {
    borderColor: COLORS.textTertiary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  devLinkText: { color: COLORS.textSecondary },
});
