import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LevelBadgeDef } from '../constants/levelBadges';
import { COLORS, SPACING, FONT, RADIUS } from '../constants/theme';

interface Props {
  visible: boolean;
  level: number;
  badge?: LevelBadgeDef;
  onDismiss: () => void;
}

export function LevelUpModal({ visible, level, badge, onDismiss }: Props) {
  const scaleAnim   = useRef(new Animated.Value(0.65)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bgOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scaleAnim.setValue(0.65);
    opacityAnim.setValue(0);
    bgOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />

        <Animated.View
          style={[
            styles.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.sparkles}>✨  ✨  ✨</Text>

          <Text style={styles.title}>LEVEL  UP!</Text>

          <View style={styles.levelCircle}>
            <Text style={styles.levelNum}>{level}</Text>
          </View>

          {badge ? (
            <>
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
              </View>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDesc}>{badge.description}</Text>
              <Text style={styles.badgeUnlocked}>New badge unlocked!</Text>
            </>
          ) : (
            <Text style={styles.noBadge}>Keep riding to unlock more badges</Text>
          )}

          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.btnText}>Awesome! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: 300,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  sparkles: {
    fontSize: 20,
    marginBottom: SPACING.xs,
    letterSpacing: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: FONT.weight.heavy,
    color: '#FFD700',
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  levelCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  levelNum: {
    fontSize: 38,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
    lineHeight: 44,
  },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.achievementDim,
    borderWidth: 1.5,
    borderColor: COLORS.achievement + '80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  badgeIcon: { fontSize: 34 },
  badgeName: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.achievement,
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  badgeUnlocked: {
    fontSize: FONT.size.xs,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
    marginBottom: SPACING.lg,
  },
  noBadge: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
  },
  btnText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
  },
});
