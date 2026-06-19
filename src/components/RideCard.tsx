import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ride } from '../types';
import { formatDuration, formatDate, formatTime } from '../utils/format';
import { COLORS, RADIUS, SPACING, FONT } from '../constants/theme';
import { Icon } from './Icon';

const DELETE_WIDTH = 80;
const OPEN_THRESHOLD = 40;

interface Props {
  ride: Ride;
  unit: 'km' | 'miles';
  sport?: 'cycling' | 'running';
  onDelete?: (id: string) => void;
  onPress?: (ride: Ride) => void;
}

const MOOD_EMOJIS: Record<number, string> = { 1: '😴', 2: '😕', 3: '😊', 4: '😄', 5: '🔥' };

export function RideCard({ ride, unit, sport = 'cycling', onDelete, onPress }: Props) {
  const prefix = ride.isEstimatedDistance ? '~' : '';
  const distance = ride.distance
    ? unit === 'miles'
      ? `${prefix}${(ride.distance * 0.621371).toFixed(1)} mi`
      : `${prefix}${ride.distance.toFixed(1)} km`
    : null;

  const tx = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const delRef = useRef(onDelete);
  delRef.current = onDelete;

  function snapClose() {
    Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
    isOpen.current = false;
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (!delRef.current) return false;
        if (Math.abs(dy) >= Math.abs(dx)) return false;
        if (!isOpen.current && dx > 0) return false;
        return Math.abs(dx) > 5;
      },
      onPanResponderMove: (_, { dx }) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        tx.setValue(Math.max(-DELETE_WIDTH, Math.min(0, base + dx)));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const total = base + dx;
        if (total < -OPEN_THRESHOLD || vx < -0.5) {
          Animated.spring(tx, { toValue: -DELETE_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
          if (!isOpen.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          isOpen.current = true;
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
          isOpen.current = false;
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        isOpen.current = false;
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteAction}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            Animated.timing(tx, { toValue: -500, duration: 220, useNativeDriver: true }).start(
              () => delRef.current?.(ride.id)
            );
          }}
        >
          <Text style={styles.deleteLabel}>Delete</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={{ transform: [{ translateX: tx }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => { isOpen.current ? snapClose() : onPress?.(ride); }}
          activeOpacity={0.7}
        >
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <Icon name={sport === 'running' ? 'runner' : 'bicycle'} size={22} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.duration}>{formatDuration(ride.duration)}</Text>
              <Text style={styles.date}>{formatDate(ride.date)} · {formatTime(ride.date)}</Text>
            </View>
          </View>
          <View style={styles.right}>
            {distance && <Text style={styles.stat}>{distance}</Text>}
            {ride.calories != null && <Text style={styles.statSub}>{ride.calories} cal</Text>}
            {ride.mood != null && <Text style={styles.moodTag}>{MOOD_EMOJIS[ride.mood]}</Text>}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    color: COLORS.white,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  moodTag: {
    fontSize: FONT.size.sm,
    marginTop: 2,
    textAlign: 'right',
  },
});
