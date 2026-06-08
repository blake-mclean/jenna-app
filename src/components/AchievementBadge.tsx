import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AchievementDef } from '../types';
import { COLORS, RADIUS, SPACING, FONT } from '../constants/theme';

const GAP = SPACING.sm;
const H_PADDING = SPACING.md * 2;
const CARD_WIDTH = Math.floor((Dimensions.get('window').width - H_PADDING - GAP * 2) / 3);

interface Props {
  def: AchievementDef;
  earned: boolean;
  earnedDate?: string;
}

export function AchievementBadge({ def, earned, earnedDate }: Props) {
  return (
    <View style={[styles.card, !earned && styles.locked]}>
      <View style={[styles.iconWrap, earned ? styles.iconEarned : styles.iconLocked]}>
        <Text style={[styles.icon, !earned && styles.iconGray]}>{def.icon}</Text>
      </View>
      <Text style={[styles.name, !earned && styles.nameLocked]}>{def.name}</Text>
      <Text style={styles.desc} numberOfLines={2}>{def.description}</Text>
      {earned && earnedDate && (
        <Text style={styles.date}>
          {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      )}
      {!earned && <View style={styles.lockIcon}><Text style={styles.lockText}>🔒</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.achievement + '60',
  },
  locked: {
    opacity: 0.5,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  iconEarned: {
    backgroundColor: COLORS.achievementDim,
  },
  iconLocked: {
    backgroundColor: COLORS.border,
  },
  icon: {
    fontSize: 24,
  },
  iconGray: {
    opacity: 0.5,
  },
  name: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.achievement,
    textAlign: 'center',
    marginBottom: 2,
  },
  nameLocked: {
    color: COLORS.textSecondary,
  },
  desc: {
    fontSize: 10,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
  date: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  lockText: {
    fontSize: 10,
  },
});
