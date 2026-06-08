import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ride } from '../types';
import { formatDuration, formatDate, formatTime } from '../utils/format';
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../constants/theme';

interface Props {
  ride: Ride;
  unit: 'km' | 'miles';
  onDelete?: (id: string) => void;
  onPress?: (ride: Ride) => void;
}

export function RideCard({ ride, unit, onDelete, onPress }: Props) {
  const distance = ride.distance
    ? unit === 'miles'
      ? `${(ride.distance * 0.621371).toFixed(1)} mi`
      : `${ride.distance.toFixed(1)} km`
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress ? () => onPress(ride) : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🚴</Text>
        </View>
        <View>
          <Text style={styles.duration}>{formatDuration(ride.duration)}</Text>
          <Text style={styles.date}>{formatDate(ride.date)} · {formatTime(ride.date)}</Text>
        </View>
      </View>

      <View style={styles.right}>
        {distance && <Text style={styles.stat}>{distance}</Text>}
        {ride.calories != null && <Text style={styles.statSub}>{ride.calories} cal</Text>}
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(ride.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.delete}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  duration: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  stat: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  statSub: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  delete: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
});
