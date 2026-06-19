import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '../constants/theme';
import { getLevelInfo } from '../utils/levels';

export { getLevelInfo };

// ─── Track Geometry ───────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_PAD = SPACING.md;
const SVG_W = SCREEN_W - PAGE_PAD * 2;
const SVG_H = 168;

const STROKE = 3.5;       // base track stroke width
const GLOW_W = STROKE * 5; // glow layer width
const MARGIN = GLOW_W / 2 + 3; // prevent clipping

const TW = SVG_W - MARGIN * 2; // track box width
const TH = SVG_H - MARGIN * 2; // track box height
const R  = TH / 2;             // corner radius — full semicircles
const S  = TW - 2 * R;        // straight section length
const C  = Math.PI * R;       // semicircle arc length
const TOTAL = 2 * S + 2 * C;  // total path length

const OX = MARGIN;
const OY = MARGIN;

// Closed oval path, clockwise from top-left of the top straight
const OVAL = [
  `M ${OX + R} ${OY}`,
  `H ${OX + TW - R}`,
  `A ${R} ${R} 0 0 1 ${OX + TW - R} ${OY + TH}`,
  `H ${OX + R}`,
  `A ${R} ${R} 0 0 1 ${OX + R} ${OY}`,
].join(' ');

// Compute (x, y) from normalised progress [0–1] along the track
function posAt(progress: number): { x: number; y: number } {
  const d = Math.max(0, Math.min(progress, 1)) * TOTAL;
  // Segment 1: top straight →
  if (d <= S) return { x: OX + R + d, y: OY };
  // Segment 2: right semicircle ↓
  const d2 = d - S;
  if (d2 <= C) {
    const a = -Math.PI / 2 + d2 / R;
    return { x: OX + TW - R + R * Math.cos(a), y: OY + R + R * Math.sin(a) };
  }
  // Segment 3: bottom straight ←
  const d3 = d - S - C;
  if (d3 <= S) return { x: OX + TW - R - d3, y: OY + TH };
  // Segment 4: left semicircle ↑
  const d4 = d - 2 * S - C;
  const a = Math.PI / 2 + d4 / R;
  return { x: OX + R + R * Math.cos(a), y: OY + R + R * Math.sin(a) };
}

// Animated wrappers for SVG primitives
const AnimPath   = Animated.createAnimatedComponent(Path);
const AnimCircle = Animated.createAnimatedComponent(Circle);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  totalMiles: number;
  distanceUnit?: 'km' | 'miles';
  focused?: boolean;
  animate?: boolean;
  onLevelUp?: (newLevel: number) => void;
}

export function CycleTrack({ totalMiles, distanceUnit = 'miles', focused = true, animate = false, onLevelUp }: Props) {
  const { level: actualLevel, progress: actualProgress, milesLeft: actualMilesLeft } = getLevelInfo(totalMiles);

  const levelRef     = useRef(actualLevel);
  const onLevelUpRef = useRef(onLevelUp);
  onLevelUpRef.current = onLevelUp;

  // displayLevel controls the centre label independently of totalMiles,
  // so the number stays at the OLD level during the fill-to-completion animation.
  const [displayLevel, setDisplayLevel]   = useState(actualLevel);
  const [isLevelingUp, setIsLevelingUp]   = useState(false);

  const animProg   = useRef(new Animated.Value(actualProgress)).current;
  const dotX       = useRef(new Animated.Value(posAt(actualProgress).x)).current;
  const dotY       = useRef(new Animated.Value(posAt(actualProgress).y)).current;
  const glowPulse  = useRef(new Animated.Value(0.18)).current;
  const levelScale = useRef(new Animated.Value(1)).current;

  // Pulsing dot-glow opacity
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.55, duration: 900, useNativeDriver: false }),
        Animated.timing(glowPulse, { toValue: 0.18, duration: 900, useNativeDriver: false }),
      ])
    ).start();
    return () => glowPulse.stopAnimation();
  }, []);

  // Keep dot position in sync with animProg
  useEffect(() => {
    const id = animProg.addListener(({ value }) => {
      const p = posAt(value);
      dotX.setValue(p.x);
      dotY.setValue(p.y);
    });
    return () => animProg.removeListener(id);
  }, []);

  // Animate progress — only when the screen is visible (focused)
  useEffect(() => {
    const info = getLevelInfo(totalMiles);

    if (!focused) {
      animProg.stopAnimation();
      return;
    }

    if (!animate) {
      // Snap to the correct position without playing animation or firing onLevelUp.
      // This prevents the track from replaying every time the app is opened.
      levelRef.current = info.level;
      setDisplayLevel(info.level);
      animProg.setValue(info.progress);
      return;
    }

    const didLevelUp = info.level > levelRef.current;

    if (didLevelUp) {
      const newLevel = info.level;
      levelRef.current = newLevel;
      setIsLevelingUp(true);

      // Step 1 — fill the OLD level track all the way to 100%.
      Animated.timing(animProg, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }).start(() => {
        // Step 2 — snap to start of the new level and update the display label.
        animProg.setValue(0);
        setDisplayLevel(newLevel);
        setIsLevelingUp(false);

        // Step 3 — fill the NEW level track to the current progress.
        Animated.timing(animProg, {
          toValue: info.progress,
          duration: 1400,
          useNativeDriver: false,
        }).start(() => {
          // Step 4 — bounce the level number, then fire the modal callback.
          Animated.sequence([
            Animated.timing(levelScale, { toValue: 1.75, duration: 180, useNativeDriver: true }),
            Animated.spring(levelScale, {
              toValue: 1,
              friction: 4,
              tension: 120,
              useNativeDriver: true,
            }),
          ]).start(() => onLevelUpRef.current?.(newLevel));
        });
      });
    } else {
      setDisplayLevel(info.level);
      Animated.timing(animProg, {
        toValue: info.progress,
        duration: 1400,
        useNativeDriver: false,
      }).start();
    }
  }, [totalMiles, focused, animate]);

  // strokeDashoffset: TOTAL = empty track, 0 = full track
  const dashOffset = animProg.interpolate({
    inputRange:  [0, 1],
    outputRange: [TOTAL, 0],
  });

  const distLeft = distanceUnit === 'km'
    ? actualMilesLeft / 0.621371
    : actualMilesLeft;
  const distLabel = distanceUnit === 'km' ? 'km' : 'mi';
  const subtitle = isLevelingUp
    ? 'Leveling up!'
    : actualMilesLeft < 0.05
      ? `Level ${displayLevel + 1} unlocked!`
      : `${distLeft.toFixed(1)} ${distLabel} to level ${displayLevel + 1}`;

  return (
    <View style={styles.container}>
      <Svg width={SVG_W} height={SVG_H}>
        {/* ── Background track ── */}
        <Path
          d={OVAL}
          stroke={COLORS.textTertiary}
          strokeOpacity={0.28}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={TOTAL}
          strokeDashoffset={0}
        />

        {/* ── Progress glow (wide, translucent) ── */}
        <AnimPath
          d={OVAL}
          stroke={COLORS.primary}
          strokeOpacity={0.22}
          strokeWidth={GLOW_W}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={TOTAL}
          strokeDashoffset={dashOffset}
        />

        {/* ── Progress line ── */}
        <AnimPath
          d={OVAL}
          stroke={COLORS.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={TOTAL}
          strokeDashoffset={dashOffset}
        />

        {/* ── Dot glow (pulsing) ── */}
        <AnimCircle
          cx={dotX}
          cy={dotY}
          r={11}
          fill={COLORS.primary}
          opacity={glowPulse}
        />

        {/* ── Dot body ── */}
        <AnimCircle cx={dotX} cy={dotY} r={5.5} fill={COLORS.primary} />

        {/* ── Dot centre ── */}
        <AnimCircle cx={dotX} cy={dotY} r={2} fill={COLORS.white} opacity={0.9} />
      </Svg>

      {/* ── Centre label ── */}
      <View style={styles.label} pointerEvents="none">
        <Text style={styles.levelTag}>LEVEL</Text>
        <Animated.Text
          style={[styles.levelNum, { transform: [{ scale: levelScale }] }]}
        >
          {displayLevel}
        </Animated.Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SVG_W,
    height: SVG_H,
    alignSelf: 'center',
    position: 'relative',
  },
  label: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTag: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textSecondary,
    letterSpacing: 3.5,
  },
  levelNum: {
    fontSize: 42,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    lineHeight: 50,
  },
  subtitle: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
});
