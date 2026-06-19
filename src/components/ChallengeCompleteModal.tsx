import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CHALLENGE_DEFS } from '../constants/challenges';
import { RUNNING_CHALLENGE_DEFS } from '../constants/runningChallenges';
import { xpForChallenge } from '../utils/xp';
import { useApp } from '../context/AppContext';
import { COLORS, FONT, RADIUS } from '../constants/theme';
import { Icon, IconName } from './Icon';

const { width: SW, height: SH } = Dimensions.get('window');

// Confetti final positions as fractions of screen size — scattered around the card
const CONFETTI_DEFS: { xF: number; yF: number; w: number; h: number; rot: number; color: string }[] = [
  // Left edge strip
  { xF: 0.03, yF: 0.10, w: 12, h: 6,  rot: 35,  color: '#FF7A35' },
  { xF: 0.06, yF: 0.18, w: 8,  h: 5,  rot: -22, color: '#9B6DFF' },
  { xF: 0.02, yF: 0.28, w: 7,  h: 5,  rot: 48,  color: '#4D9FFF' },
  { xF: 0.08, yF: 0.37, w: 10, h: 5,  rot: -15, color: '#00FFCC' },
  { xF: 0.03, yF: 0.46, w: 6,  h: 8,  rot: 62,  color: '#FFD700' },
  { xF: 0.07, yF: 0.55, w: 11, h: 5,  rot: -40, color: '#FF4D6A' },
  { xF: 0.02, yF: 0.64, w: 8,  h: 5,  rot: 28,  color: '#00D4AA' },
  { xF: 0.06, yF: 0.74, w: 9,  h: 5,  rot: -55, color: '#9B6DFF' },
  { xF: 0.04, yF: 0.83, w: 7,  h: 6,  rot: 18,  color: '#FF7A35' },
  // Right edge strip
  { xF: 0.88, yF: 0.08, w: 10, h: 5,  rot: -30, color: '#4D9FFF' },
  { xF: 0.91, yF: 0.17, w: 8,  h: 5,  rot: 44,  color: '#FFD700' },
  { xF: 0.87, yF: 0.27, w: 6,  h: 8,  rot: -18, color: '#FF4D6A' },
  { xF: 0.92, yF: 0.36, w: 12, h: 6,  rot: 52,  color: '#00FFCC' },
  { xF: 0.89, yF: 0.45, w: 8,  h: 5,  rot: -36, color: '#9B6DFF' },
  { xF: 0.93, yF: 0.55, w: 7,  h: 5,  rot: 24,  color: '#FF7A35' },
  { xF: 0.88, yF: 0.64, w: 9,  h: 5,  rot: -48, color: '#4D9FFF' },
  { xF: 0.91, yF: 0.73, w: 6,  h: 8,  rot: 38,  color: '#00D4AA' },
  { xF: 0.87, yF: 0.82, w: 10, h: 5,  rot: -22, color: '#FFD700' },
  // Top strip
  { xF: 0.15, yF: 0.05, w: 8,  h: 5,  rot: 30,  color: '#9B6DFF' },
  { xF: 0.30, yF: 0.03, w: 12, h: 6,  rot: -45, color: '#FF7A35' },
  { xF: 0.50, yF: 0.04, w: 7,  h: 5,  rot: 60,  color: '#4D9FFF' },
  { xF: 0.65, yF: 0.03, w: 9,  h: 5,  rot: -20, color: '#00FFCC' },
  { xF: 0.78, yF: 0.06, w: 6,  h: 8,  rot: 42,  color: '#FFD700' },
  // Bottom strip
  { xF: 0.12, yF: 0.91, w: 8,  h: 5,  rot: -32, color: '#FF4D6A' },
  { xF: 0.28, yF: 0.93, w: 10, h: 5,  rot: 50,  color: '#9B6DFF' },
  { xF: 0.45, yF: 0.92, w: 7,  h: 6,  rot: -15, color: '#00D4AA' },
  { xF: 0.62, yF: 0.94, w: 12, h: 5,  rot: 38,  color: '#FF7A35' },
  { xF: 0.76, yF: 0.91, w: 8,  h: 5,  rot: -55, color: '#4D9FFF' },
  // Side-middle scatter
  { xF: 0.13, yF: 0.33, w: 9,  h: 5,  rot: 28,  color: '#FFD700' },
  { xF: 0.79, yF: 0.41, w: 8,  h: 5,  rot: -38, color: '#FF4D6A' },
  { xF: 0.10, yF: 0.51, w: 6,  h: 8,  rot: 45,  color: '#00FFCC' },
  { xF: 0.83, yF: 0.59, w: 10, h: 5,  rot: -25, color: '#9B6DFF' },
  { xF: 0.14, yF: 0.68, w: 8,  h: 5,  rot: 55,  color: '#FF7A35' },
  { xF: 0.80, yF: 0.71, w: 7,  h: 6,  rot: -42, color: '#00D4AA' },
  { xF: 0.17, yF: 0.79, w: 9,  h: 5,  rot: 32,  color: '#4D9FFF' },
  { xF: 0.77, yF: 0.86, w: 6,  h: 8,  rot: -18, color: '#FFD700' },
];

// Explosion origin near the trophy (top-center of screen)
const ORIGIN_X = SW / 2;
const ORIGIN_Y = SH * 0.28;

function springCfg(i: number) {
  const cfgs = [
    { friction: 4, tension: 40 },
    { friction: 5, tension: 52 },
    { friction: 3, tension: 36 },
    { friction: 6, tension: 46 },
    { friction: 4, tension: 58 },
  ];
  return cfgs[i % cfgs.length];
}

interface Props {
  visible: boolean;
  challengeId: string;
  onDismiss: () => void;
}

export function ChallengeCompleteModal({ visible, challengeId, onDismiss }: Props) {
  const { data } = useApp();
  const firstName = (data.profile.name ?? 'Champion').split(' ')[0];

  const def = CHALLENGE_DEFS.find((c) => c.id === challengeId)
    ?? RUNNING_CHALLENGE_DEFS.find((c) => c.id === challengeId);

  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bgOpacity   = useRef(new Animated.Value(0)).current;

  const confettiAnims = useRef(
    CONFETTI_DEFS.map(() => ({
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      rot: new Animated.Value(0),
      op:  new Animated.Value(0),
    }))
  ).current;

  function resetConfetti() {
    confettiAnims.forEach((a, i) => {
      const p = CONFETTI_DEFS[i];
      a.tx.setValue(ORIGIN_X - p.xF * SW);
      a.ty.setValue(ORIGIN_Y - p.yF * SH);
      a.rot.setValue(0);
      a.op.setValue(0);
    });
  }

  useEffect(() => {
    if (!visible) { resetConfetti(); return; }

    resetConfetti();
    scaleAnim.setValue(0.7);
    opacityAnim.setValue(0);
    bgOpacity.setValue(0);

    // Card entrance
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
    ]).start();

    // Confetti explosion
    Animated.sequence([
      Animated.delay(80),
      Animated.stagger(18,
        confettiAnims.map((a, i) => {
          const { friction, tension } = springCfg(i);
          return Animated.parallel([
            Animated.spring(a.tx, { toValue: 0, friction, tension, useNativeDriver: true }),
            Animated.spring(a.ty, { toValue: 0, friction, tension, useNativeDriver: true }),
            Animated.timing(a.rot, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(a.op,  { toValue: 1, duration: 200, useNativeDriver: true }),
          ]);
        })
      ),
    ]).start();
  }, [visible]);

  if (!def) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />

        {/* Full-screen confetti on the overlay */}
        {CONFETTI_DEFS.map((p, i) => {
          const { tx, ty, rot, op } = confettiAnims[i];
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                top: p.yF * SH,
                left: p.xF * SW,
                width: p.w,
                height: p.h,
                borderRadius: 2,
                backgroundColor: p.color,
                opacity: op,
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
                ],
              }}
            />
          );
        })}

        {/* Trophy + card as one animated unit */}
        <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Trophy floats above the card */}
          <Image
            source={require('../../assets/images/icon-challenge-trophy-t.png')}
            style={styles.trophyImg}
            resizeMode="contain"
          />

          {/* Card */}
          <View style={styles.card}>

            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>{'CHALLENGE\nCOMPLETE!'}</Text>

            {/* Challenge info row */}
            <View style={styles.challengeRow}>
              <LinearGradient
                colors={['#3B2080', '#1A0E4A']}
                style={styles.iconCircle}
              >
                <Icon name={def.icon as IconName} size={28} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeName}>{def.name}</Text>
                <Text style={styles.challengeDesc}>{def.description}</Text>
              </View>
            </View>

            {/* Personalised message */}
            <Text style={styles.greatWork}>Great work, {firstName}! 💪</Text>

            {/* YOU EARNED */}
            <View style={styles.earnedBox}>
              <Text style={styles.earnedTitle}>YOU EARNED</Text>
              <View style={styles.earnedRow}>
                <View style={styles.earnedLeft}>
                  <Text style={styles.xpAmount}>+{xpForChallenge(def.target)}</Text>
                  <Text style={styles.xpLabel}>XP</Text>
                </View>
                <View style={styles.earnedDivider} />
                <View style={styles.earnedRight}>
                  <Image
                    source={require('../../assets/images/icon-hex-trophy-t.png')}
                    style={styles.hexTrophyImg}
                    resizeMode="contain"
                  />
                  <View style={styles.badgeTextWrap}>
                    <Text style={styles.newLabel}>New</Text>
                    <Text style={styles.badgeLabel}>Badge</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
              <Text style={styles.btnText}>Keep It Going!</Text>
            </TouchableOpacity>

          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const CARD_W = 326;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  // Trophy + card wrapper
  container: {
    alignItems: 'center',
    width: CARD_W,
  },
  trophyImg: {
    width: 158,
    height: 170,
    marginBottom: -48,
    zIndex: 2,
  },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: '#0B1422',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.28)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
  },

  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
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

  title: {
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: 20,
    textShadowColor: 'rgba(0,212,170,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },

  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    gap: 14,
    marginBottom: 18,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  challengeDesc: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  greatWork: {
    fontSize: FONT.size.lg,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
  },

  earnedBox: {
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
  earnedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  earnedLeft: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  xpAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
    lineHeight: 46,
  },
  xpLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
  },
  earnedDivider: {
    width: 1,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  earnedRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  hexTrophyImg: {
    width: 52,
    height: 52,
  },
  badgeTextWrap: {
    gap: 1,
  },
  newLabel: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
  },
  badgeLabel: {
    fontSize: FONT.size.sm,
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
    fontSize: FONT.size.lg,
    fontWeight: '800',
    color: COLORS.black,
  },
});
