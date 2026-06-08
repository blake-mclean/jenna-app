import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChallengeDef, ChallengeState } from '../types';
import { COLORS, RADIUS, SPACING, FONT } from '../constants/theme';

interface Props {
  def: ChallengeDef;
  state?: ChallengeState;
  onEnroll: (id: string) => void;
  onUnenroll: (id: string) => void;
}

export function ChallengeCard({ def, state, onEnroll, onUnenroll }: Props) {
  const enrolled = state?.enrolled ?? false;
  const progress = state?.progress ?? 0;
  const completed = state?.completed ?? false;
  const pct = Math.min((progress / def.target) * 100, 100);

  return (
    <View style={[styles.card, completed && styles.cardComplete]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{def.icon}</Text>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={styles.desc}>{def.description}</Text>
        </View>
        {completed ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Done ✓</Text>
          </View>
        ) : enrolled ? (
          <TouchableOpacity style={styles.btnLeave} onPress={() => onUnenroll(def.id)}>
            <Text style={styles.btnLeaveText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnJoin} onPress={() => onEnroll(def.id)}>
            <Text style={styles.btnJoinText}>Join</Text>
          </TouchableOpacity>
        )}
      </View>

      {enrolled && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{progress} / {def.target}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardComplete: {
    borderColor: COLORS.primary + '60',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  icon: {
    fontSize: 28,
  },
  titleWrap: {
    flex: 1,
  },
  name: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  desc: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  btnJoin: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  btnJoinText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.black,
  },
  btnLeave: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  btnLeaveText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  completedBadge: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  completedText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  progressWrap: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    width: 48,
    textAlign: 'right',
  },
});
