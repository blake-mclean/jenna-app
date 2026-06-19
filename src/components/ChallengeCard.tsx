import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChallengeDef, ChallengeState } from '../types';
import { COLORS, RADIUS, SPACING, FONT } from '../constants/theme';
import { Icon, IconName } from './Icon';

// Gradient colors per challenge icon
const ICON_GRADIENT: Record<string, [string, string]> = {
  mountain:  ['#7040C0', '#3D1E78'],
  clock:     ['#C85400', '#7A2800'],
  calendar:  ['#008078', '#003D3A'],
  trophy:    ['#1850A8', '#0A2870'],
  flame:     ['#C84000', '#781800'],
  route:     ['#186840', '#083820'],
  lightning: ['#A07800', '#5A4000'],
  flag:      ['#5838A8', '#2A1860'],
  tree:      ['#187820', '#083808'],
  wrench:    ['#3A4850', '#1A2228'],
  muscle:    ['#9A3060', '#501028'],
  shield:    ['#284888', '#0E2048'],
  moon:      ['#4028A0', '#1E1050'],
  sunrise:   ['#C07000', '#784000'],
  bicycle:   ['#008078', '#003D3A'],
  runner:    ['#186840', '#083820'],
  star:      ['#A07800', '#5A4000'],
  target:    ['#C84000', '#781800'],
  medal:     ['#B07800', '#5A3C00'],
  globe:     ['#005A90', '#003060'],
};

function gradientFor(icon: string): [string, string] {
  return ICON_GRADIENT[icon] ?? ['#303050', '#181828'];
}

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
  const completedDate = state?.completedDate;
  const [gradTop, gradBot] = gradientFor(def.icon);

  return (
    <View style={[styles.card, completed && styles.cardComplete]}>
      <View style={styles.row}>
        {/* Icon circle */}
        <LinearGradient colors={[gradTop, gradBot]} style={styles.iconCircle}>
          <Icon name={def.icon as IconName} size={24} color="#FFFFFF" />
        </LinearGradient>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={styles.desc}>{def.description}</Text>
          {completed && completedDate ? (
            <Text style={styles.completedDate}>
              {new Date(completedDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          ) : null}
        </View>

        {/* Right: button or badge */}
        {completed ? (
          <View style={styles.checkCircle}>
            <Icon name="check" size={16} color={COLORS.primary} />
          </View>
        ) : enrolled ? (
          <TouchableOpacity style={styles.btn} onPress={() => onUnenroll(def.id)}>
            <Text style={styles.btnText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={() => onEnroll(def.id)}>
            <Text style={styles.btnText}>Enroll</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar — shown when enrolled (includes completed via auto-leave) */}
      {enrolled && !completed && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.progressLabel} numberOfLines={1}>
            {Math.round(progress)}/{def.target}{def.type === 'distance' ? ' km' : def.type === 'duration' ? ' m' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E0E1C',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  cardComplete: {
    borderColor: 'rgba(0,212,170,0.25)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  desc: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  completedDate: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 3,
  },

  btn: {
    borderWidth: 1,
    borderColor: '#3A3A58',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexShrink: 0,
  },
  btnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingLeft: 68, // align with text (56px circle + 12px gap)
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E1E30',
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
    flexShrink: 0,
    textAlign: 'right',
  },
});
