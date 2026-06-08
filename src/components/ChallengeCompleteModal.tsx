import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { CHALLENGE_DEFS } from '../constants/challenges';
import { COLORS, SPACING, FONT, RADIUS } from '../constants/theme';

interface Props {
  visible: boolean;
  challengeId: string;
  onDismiss: () => void;
}

export function ChallengeCompleteModal({ visible, challengeId, onDismiss }: Props) {
  const def = CHALLENGE_DEFS.find((c) => c.id === challengeId);

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

  if (!def) return null;

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
          <Text style={styles.checkmark}>✅</Text>
          <Text style={styles.title}>Challenge Complete!</Text>

          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{def.icon}</Text>
          </View>

          <Text style={styles.challengeName}>{def.name}</Text>
          <Text style={styles.challengeDesc}>{def.description}</Text>

          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.btnText}>Let's go! 🎉</Text>
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
  checkmark: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  icon: { fontSize: 34 },
  challengeName: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  challengeDesc: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
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
