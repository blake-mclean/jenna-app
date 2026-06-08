import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '../constants/theme';

interface Props {
  completed: number;
  goal: number;
  size?: number;
}

export function WeeklyRing({ completed, goal, size = 120 }: Props) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(completed / Math.max(goal, 1), 1);
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[styles.label, { width: size, height: size }]}>
        <Text style={styles.count}>{completed}</Text>
        <Text style={styles.sub}>of {goal}</Text>
        <Text style={styles.subText}>this week</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
    lineHeight: FONT.size.xxl + 4,
  },
  sub: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  subText: {
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
  },
});
