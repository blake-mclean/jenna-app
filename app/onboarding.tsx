import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { COLORS, SPACING, FONT, RADIUS } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  icon: string;
  accent: string;
  title: string;
  body: string;
  bullets?: string[];
}

const SLIDES: Slide[] = [
  {
    icon: '🚴',
    accent: COLORS.primary,
    title: 'Welcome to JENNA',
    body: 'Your personal indoor cycling companion. JENNA tracks every ride, celebrates your progress, and keeps you motivated to hit the saddle.',
  },
  {
    icon: '📝',
    accent: COLORS.blue,
    title: 'Log Your Rides',
    body: 'Tap "Log a Ride" from the home screen after each session. Fill in what you know — only duration is required.',
    bullets: ['Duration, distance, calories', 'Resistance level & heart rate', 'Instructor & personal notes'],
  },
  {
    icon: '⬆️',
    accent: '#FFD700',
    title: 'Level Up',
    body: 'Every mile you ride earns progress on the Cycle Level track. Level up to unlock exclusive profile badges.',
    bullets: ['Watch your dot lap the oval track', 'Earn badges from Sprout to Legend', 'Equip a badge to show it on your profile'],
  },
  {
    icon: '🏆',
    accent: COLORS.achievement,
    title: 'Challenges & Achievements',
    body: 'Join real-world cycling challenges and earn achievement badges for reaching personal milestones.',
    bullets: ['Ride the Tour de France distance (3,357 km)', 'Build long ride streaks', 'Earn 12 unique achievement badges'],
  },
];

export default function OnboardingScreen() {
  const { markOnboardingSeen } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setActiveIndex(index);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(idx);
  }

  function finish() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      markOnboardingSeen();
      router.replace('/(tabs)');
    });
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={[COLORS.background, '#0D0D1A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={finish}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <SlideView key={i} slide={slide} />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: SLIDES[activeIndex].accent }]
                  : styles.dotInactive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        {isLast ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={finish} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Get Started 🚀</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => goTo(activeIndex + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slide}>
      <View style={[styles.iconCircle, { borderColor: slide.accent + '60', backgroundColor: slide.accent + '18' }]}>
        <Text style={styles.slideIcon}>{slide.icon}</Text>
      </View>
      <Text style={[styles.slideTitle, { color: slide.accent }]}>{slide.title}</Text>
      <Text style={styles.slideBody}>{slide.body}</Text>
      {slide.bullets && (
        <View style={styles.bullets}>
          {slide.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: slide.accent }]} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skip: {
    position: 'absolute',
    top: 56,
    right: SPACING.lg,
    zIndex: 10,
  },
  skipText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  pager: {
    flex: 1,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  slideIcon: {
    fontSize: 56,
  },
  slideTitle: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.heavy,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  slideBody: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  bullets: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  bulletText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    paddingVertical: SPACING.md,
  },
  dot: {
    borderRadius: RADIUS.full,
  },
  dotActive: {
    width: 24,
    height: 8,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.textTertiary,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  btn: {
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.black,
  },
  btnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
});
