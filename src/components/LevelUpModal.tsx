import React, { useEffect, useRef } from 'react';
import {
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { LevelBadgeDef } from '../constants/levelBadges';
import { xpForLevelUp } from '../utils/xp';
import { COLORS, FONT, RADIUS } from '../constants/theme';

// Final resting positions, sizes, and colors for each confetti piece.
// Animation starts all pieces at the shield center and springs them outward.
const CONFETTI: { top: number; left: number; w: number; h: number; rot: number; color: string }[] = [
  // Top strip
  { top: 6,   left: 12,  w: 13, h: 6,  rot: 40,  color: '#FF7A35' },
  { top: 3,   left: 55,  w: 8,  h: 5,  rot: -18, color: '#4D9FFF' },
  { top: 14,  left: 100, w: 6,  h: 10, rot: 28,  color: '#9B6DFF' },
  { top: 5,   left: 158, w: 12, h: 6,  rot: -44, color: '#00D4AA' },
  { top: 12,  left: 215, w: 8,  h: 5,  rot: 14,  color: '#FFD700' },
  { top: 22,  left: 272, w: 6,  h: 8,  rot: -30, color: '#FF4D6A' },
  { top: 4,   left: 135, w: 7,  h: 5,  rot: 55,  color: '#00FFCC' },
  { top: 18,  left: 78,  w: 10, h: 5,  rot: 32,  color: '#FF7A35' },
  { top: 8,   left: 248, w: 9,  h: 5,  rot: -25, color: '#9B6DFF' },
  // Left side
  { top: 55,  left: 6,   w: 8,  h: 5,  rot: 22,  color: '#9B6DFF' },
  { top: 100, left: 14,  w: 6,  h: 8,  rot: -16, color: '#00D4AA' },
  { top: 150, left: 8,   w: 11, h: 5,  rot: 33,  color: '#4D9FFF' },
  { top: 195, left: 12,  w: 6,  h: 8,  rot: 48,  color: '#FF4D6A' },
  { top: 235, left: 6,   w: 8,  h: 5,  rot: -28, color: '#00FFCC' },
  { top: 278, left: 10,  w: 10, h: 5,  rot: 44,  color: '#FF7A35' },
  { top: 322, left: 8,   w: 6,  h: 8,  rot: -48, color: '#00D4AA' },
  { top: 365, left: 14,  w: 8,  h: 5,  rot: 25,  color: '#9B6DFF' },
  { top: 405, left: 6,   w: 10, h: 5,  rot: -22, color: '#4D9FFF' },
  { top: 442, left: 14,  w: 8,  h: 5,  rot: 18,  color: '#FFD700' },
  // Right side
  { top: 68,  left: 294, w: 10, h: 5,  rot: 38,  color: '#FF7A35' },
  { top: 130, left: 288, w: 8,  h: 5,  rot: 24,  color: '#FFD700' },
  { top: 158, left: 290, w: 6,  h: 8,  rot: -22, color: '#9B6DFF' },
  { top: 58,  left: 286, w: 9,  h: 5,  rot: -12, color: '#FF4D6A' },
  { top: 238, left: 293, w: 8,  h: 5,  rot: -38, color: '#4D9FFF' },
  { top: 272, left: 270, w: 6,  h: 8,  rot: -36, color: '#9B6DFF' },
  { top: 315, left: 258, w: 11, h: 5,  rot: 14,  color: '#FF7A35' },
  { top: 358, left: 283, w: 8,  h: 5,  rot: 32,  color: '#FF4D6A' },
  { top: 408, left: 260, w: 6,  h: 8,  rot: 46,  color: '#FFD700' },
  { top: 438, left: 293, w: 7,  h: 5,  rot: -32, color: '#00FFCC' },
  // Center scatter
  { top: 45,  left: 44,  w: 8,  h: 5,  rot: -28, color: '#00FFCC' },
  { top: 42,  left: 240, w: 10, h: 5,  rot: 58,  color: '#FF7A35' },
  { top: 82,  left: 260, w: 6,  h: 8,  rot: -43, color: '#FFD700' },
  { top: 118, left: 36,  w: 8,  h: 5,  rot: 36,  color: '#9B6DFF' },
  { top: 188, left: 250, w: 10, h: 5,  rot: -26, color: '#00D4AA' },
  { top: 345, left: 245, w: 10, h: 5,  rot: 18,  color: '#FF7A35' },
  { top: 388, left: 40,  w: 8,  h: 5,  rot: -34, color: '#4D9FFF' },
];

// Card dimensions and explosion origin (center of the shield)
const CARD_W = 326;
const ORIGIN_X = CARD_W / 2;        // 163 — horizontal center
const ORIGIN_Y = 36 + 138 / 2;      // 105 — shield vertical center (paddingTop + half shield height)

// Per-piece spring configs — deterministic variety based on distance from origin
function springConfig(i: number) {
  const phases = [
    { friction: 4, tension: 45 },
    { friction: 5, tension: 55 },
    { friction: 3, tension: 38 },
    { friction: 6, tension: 50 },
    { friction: 4, tension: 60 },
  ];
  return phases[i % phases.length];
}

interface Props {
  visible: boolean;
  level: number;
  milesTo?: number;
  badge?: LevelBadgeDef;
  onDismiss: () => void;
}

export function LevelUpModal({ visible, level, milesTo, badge, onDismiss }: Props) {
  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bgOpacity   = useRef(new Animated.Value(0)).current;

  // Animated values per confetti piece: translate from center, rotate, fade in
  const confettiAnims = useRef(
    CONFETTI.map(() => ({
      tx:  new Animated.Value(0),
      ty:  new Animated.Value(0),
      rot: new Animated.Value(0),
      op:  new Animated.Value(0),
    }))
  ).current;

  function resetConfetti() {
    confettiAnims.forEach((a, i) => {
      const p = CONFETTI[i];
      a.tx.setValue(ORIGIN_X - (p.left + p.w / 2));
      a.ty.setValue(ORIGIN_Y - (p.top + p.h / 2));
      a.rot.setValue(0);
      a.op.setValue(0);
    });
  }

  useEffect(() => {
    if (!visible) {
      resetConfetti();
      return;
    }

    // Card entrance
    resetConfetti();
    scaleAnim.setValue(0.7);
    opacityAnim.setValue(0);
    bgOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
    ]).start();

    // Confetti explosion: stagger in groups of 3, 25ms apart
    const confettiAnimation = Animated.stagger(
      25,
      confettiAnims.map((a, i) => {
        const { friction, tension } = springConfig(i);
        return Animated.parallel([
          Animated.spring(a.tx, { toValue: 0, friction, tension, useNativeDriver: true }),
          Animated.spring(a.ty, { toValue: 0, friction, tension, useNativeDriver: true }),
          Animated.timing(a.rot, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(a.op, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]);
      })
    );

    // Slight delay so explosion fires as the card finishes popping in
    Animated.sequence([
      Animated.delay(80),
      confettiAnimation,
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
          style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {/* Animated confetti pieces */}
          {CONFETTI.map((p, i) => {
            const { tx, ty, rot, op } = confettiAnims[i];
            const rotDeg = rot.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${p.rot}deg`],
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.confettiPiece,
                  {
                    top: p.top,
                    left: p.left,
                    width: p.w,
                    height: p.h,
                    backgroundColor: p.color,
                    opacity: op,
                    transform: [{ translateX: tx }, { translateY: ty }, { rotate: rotDeg }],
                  },
                ]}
              />
            );
          })}

          {/* X close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Shield with level number overlaid */}
          <Animated.View style={[styles.shieldWrap, { opacity: opacityAnim }]}>
            <Image
              source={require('../../assets/images/level-shield-t.png')}
              style={styles.shieldImg}
              resizeMode="contain"
            />
            <Animated.View style={styles.shieldNumWrap}>
              <Text style={styles.shieldNum}>{level}</Text>
            </Animated.View>
          </Animated.View>

          {/* LEVEL UP! */}
          <Text style={styles.levelUpText}>LEVEL  UP!</Text>

          {/* Subtitle */}
          <Text style={styles.reachedLabel}>You've reached</Text>
          <Text style={styles.reachedNum}>{level}</Text>

          {/* Miles to next */}
          <Text style={styles.milesText}>
            {milesTo !== undefined
              ? `${milesTo.toFixed(1)} mi to level ${level + 1}`
              : `Keep riding to level ${level + 1}`}
          </Text>

          {/* Rewards box */}
          <Animated.View style={[styles.rewardsBox, { opacity: opacityAnim }]}>
            <Text style={styles.rewardsTitle}>REWARDS UNLOCKED</Text>
            <Animated.View style={styles.rewardsRow}>

              <Animated.View style={styles.rewardCol}>
                <Image
                  source={require('../../assets/images/icon-badge-slot-t.png')}
                  style={styles.rewardIcon}
                  resizeMode="contain"
                />
                <Text style={styles.rewardVal}>+1</Text>
                <Text style={styles.rewardLbl}>Badge Slot</Text>
              </Animated.View>

              <Animated.View style={styles.divider} />

              <Animated.View style={styles.rewardCol}>
                <Image
                  source={require('../../assets/images/icon-star-t.png')}
                  style={[styles.rewardIcon, { marginLeft: 8 }]}
                  resizeMode="contain"
                />
                <Text style={styles.rewardVal}>New</Text>
                <Text style={styles.rewardLbl}>Title</Text>
              </Animated.View>

              <Animated.View style={styles.divider} />

              <Animated.View style={styles.rewardCol}>
                <Image
                  source={require('../../assets/images/icon-xp-t.png')}
                  style={styles.rewardIcon}
                  resizeMode="contain"
                />
                <Text style={styles.rewardVal}>{xpForLevelUp(level)}</Text>
                <Text style={styles.rewardLbl}>XP Points</Text>
              </Animated.View>

            </Animated.View>
          </Animated.View>

          {/* CTA */}
          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.btnText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: CARD_W,
    backgroundColor: '#0B1422',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.28)',
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30,40,58,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: FONT.weight.semibold,
    lineHeight: 17,
  },
  shieldWrap: {
    width: 138,
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginLeft: 8,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
  },
  shieldImg: {
    width: 138,
    height: 138,
  },
  shieldNumWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  shieldNum: {
    fontSize: 54,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 60,
    marginLeft: -14,
  },
  levelUpText: {
    fontSize: 38,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 12,
    textShadowColor: 'rgba(0,212,170,0.70)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  reachedLabel: {
    fontSize: 15,
    fontWeight: FONT.weight.regular,
    color: COLORS.textPrimary,
    marginBottom: 0,
  },
  reachedNum: {
    fontSize: 68,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 74,
    marginBottom: 2,
  },
  milesText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  rewardsBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.18)',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 18,
  },
  rewardsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rewardCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  divider: {
    width: 1,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  rewardIcon: {
    width: 46,
    height: 46,
    alignSelf: 'center',
  },
  rewardVal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rewardLbl: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.black,
  },
});
