import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const PARTICLE_COUNT = 40;

// Same rectangular shapes as LevelUpModal confetti
const PIECE_SIZES = [
  { w: 13, h: 6 }, { w: 8, h: 5 }, { w: 6, h: 10 }, { w: 12, h: 6 },
  { w: 8, h: 5 }, { w: 6, h: 8 }, { w: 7, h: 5 }, { w: 10, h: 5 },
  { w: 9, h: 5 }, { w: 11, h: 5 }, { w: 6, h: 8 }, { w: 8, h: 5 },
];

// Deterministic spin target (degrees) — alternates direction
function spinDeg(i: number): number {
  return (i % 2 === 0 ? 1 : -1) * (180 + (i % 5) * 60);
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rot: Animated.Value; // 0 → 1 progress, interpolated to degrees
  color: string;
  w: number;
  h: number;
  deg: string; // final rotation string e.g. "300deg"
}

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function CelebrationOverlay({ visible, onDone }: Props) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const size = PIECE_SIZES[i % PIECE_SIZES.length];
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        rot: new Animated.Value(0),
        color: COLORS.confetti[i % COLORS.confetti.length],
        w: size.w,
        h: size.h,
        deg: `${spinDeg(i)}deg`,
      };
    }),
  ).current;

  useEffect(() => {
    if (!visible) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const anims = particles.map((p, i) => {
      const startX = W * 0.1 + (i / PARTICLE_COUNT) * W * 0.8;
      const endX   = startX + (i % 2 === 0 ? 1 : -1) * (20 + (i % 7) * 25);
      const endY   = H * 0.25 + (i % 5) * (H * 0.12);
      const dur    = 1200 + (i % 6) * 100;

      p.x.setValue(startX);
      p.y.setValue(H * 0.45);
      p.opacity.setValue(1);
      p.scale.setValue(0);
      p.rot.setValue(0);

      return Animated.parallel([
        Animated.timing(p.x,       { toValue: endX, duration: dur, useNativeDriver: true }),
        Animated.timing(p.y,       { toValue: endY, duration: dur, useNativeDriver: true }),
        Animated.timing(p.rot,     { toValue: 1,    duration: dur, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.scale,   { toValue: 1,  duration: 200,             useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0,  duration: 1000, delay: 400, useNativeDriver: true }),
        ]),
      ]);
    });

    Animated.parallel(anims).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
                { rotate: p.rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.deg] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 2,
  },
});
