import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../constants/theme';
import { Icon, IconName } from './Icon';

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: string;
  iconName?: IconName;
  style?: ViewStyle;
}

export function StatCard({ label, value, sub, accent = COLORS.primary, icon, iconName, style }: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={[COLORS.surfaceElevated, COLORS.surface]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        {iconName && <View style={styles.iconWrap}><Icon name={iconName} size={20} color={accent} /></View>}
        {!iconName && icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.value, { color: accent }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    ...SHADOW.card,
  },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingTop: SPACING.md + 2,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
  },
  iconWrap: {
    marginBottom: SPACING.xs,
  },
  icon: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    marginBottom: 2,
  },
  label: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
