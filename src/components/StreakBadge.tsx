import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONT } from '../constants/theme';
interface Props {
  streak: number;
  size?: 'sm' | 'lg';
}

export function StreakBadge({ streak, size = 'lg' }: Props) {
  const isLg = size === 'lg';
  return (
    <LinearGradient
      colors={[COLORS.streak, '#FF4500']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, isLg ? styles.badgeLg : styles.badgeSm]}
    >
      <Text style={isLg ? styles.flameLg : styles.flameSm}>🔥</Text>
      <Text style={[styles.count, isLg ? styles.countLg : styles.countSm]}>{streak}</Text>
      {isLg && <Text style={styles.label}>day streak</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  badgeLg: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  badgeSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    flexDirection: 'row',
    gap: 3,
  },
  flameLg: { fontSize: 22 },
  flameSm: { fontSize: 14 },
  count: {
    color: COLORS.white,
    fontWeight: FONT.weight.heavy,
  },
  countLg: { fontSize: FONT.size.xl },
  countSm: { fontSize: FONT.size.md },
  label: {
    fontSize: FONT.size.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FONT.weight.medium,
  },
});
