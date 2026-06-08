import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { COLORS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const PARTICLE_COUNT = 40;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
}

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function CelebrationOverlay({ visible, onDone }: Props) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      color: COLORS.confetti[Math.floor(Math.random() * COLORS.confetti.length)],
      size: 6 + Math.random() * 10,
    })),
  ).current;

  useEffect(() => {
    if (!visible) return;

    const anims = particles.map((p) => {
      const startX = Math.random() * W;
      const endX = startX + (Math.random() - 0.5) * 200;
      const endY = H * 0.3 + Math.random() * H * 0.5;

      p.x.setValue(startX);
      p.y.setValue(H * 0.5);
      p.opacity.setValue(1);
      p.scale.setValue(0);

      return Animated.parallel([
        Animated.timing(p.x, { toValue: endX, duration: 1200 + Math.random() * 600, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: endY, duration: 1200 + Math.random() * 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 1000, delay: 400, useNativeDriver: true }),
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
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
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
  },
});
