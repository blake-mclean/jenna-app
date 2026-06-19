import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../constants/theme';

interface Props {
  insight: string;
  onDismiss?: () => void;
}

export function InsightCard({ insight, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {onDismiss && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.dismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.insight}>{insight}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: SPACING.sm,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
  },
  dismiss: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  insight: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});
