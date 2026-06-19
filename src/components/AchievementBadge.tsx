import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { AchievementDef } from '../types';
import { COLORS, RADIUS, SPACING, FONT } from '../constants/theme';
import { Icon } from './Icon';

const { width: SW } = Dimensions.get('window');
const H_PAD = SPACING.md * 2;
const GAP = 10;
const CARD_W = Math.floor((SW - H_PAD - GAP * 2) / 3);
const SHIELD_W = CARD_W - 6;
const SHIELD_H = Math.round(SHIELD_W * (312 / 269));

// Maps achievement ID → shield image asset
const SHIELD_BY_ID: Record<string, any> = {
  'first-ride':      require('../../assets/images/badge-bicycle.png'),
  'first-run':       require('../../assets/images/badge-bicycle.png'),
  'ten-rides':       require('../../assets/images/badge-100.png'),
  'ten-runs':        require('../../assets/images/badge-100.png'),
  'fifty-rides':     require('../../assets/images/badge-mountain.png'),
  'fifty-runs':      require('../../assets/images/badge-mountain.png'),
  'streak-3':        require('../../assets/images/badge-flame.png'),
  'streak-7':        require('../../assets/images/badge-flame.png'),
  'streak-30':       require('../../assets/images/badge-100.png'),
  'total-100min':    require('../../assets/images/badge-pin.png'),
  'total-1000min':   require('../../assets/images/badge-mountain.png'),
  'distance-100km':  require('../../assets/images/badge-pin.png'),
  'calorie-1000':    require('../../assets/images/badge-flame.png'),
  'early-bird':      require('../../assets/images/badge-mountain.png'),
  'night-owl':       require('../../assets/images/badge-moon.png'),
};

const SHIELD_BY_ICON: Record<string, any> = {
  bicycle:  require('../../assets/images/badge-bicycle.png'),
  runner:   require('../../assets/images/badge-bicycle.png'),
  trophy:   require('../../assets/images/badge-100.png'),
  mountain: require('../../assets/images/badge-mountain.png'),
  moon:     require('../../assets/images/badge-moon.png'),
  route:    require('../../assets/images/badge-pin.png'),
  flame:    require('../../assets/images/badge-flame.png'),
  lightning:require('../../assets/images/badge-flame.png'),
  shield:   require('../../assets/images/badge-mountain.png'),
  clock:    require('../../assets/images/badge-pin.png'),
  sunrise:  require('../../assets/images/badge-mountain.png'),
  muscle:   require('../../assets/images/badge-100.png'),
};

const LOCKED_SHIELD = require('../../assets/images/badge-locked.png');

function shieldFor(def: AchievementDef): any {
  return SHIELD_BY_ID[def.id] ?? SHIELD_BY_ICON[def.icon] ?? SHIELD_BY_ICON['flame'];
}

interface Props {
  def: AchievementDef;
  earned: boolean;
  earnedDate?: string;
}

export function AchievementBadge({ def, earned, earnedDate }: Props) {
  const shield = earned ? shieldFor(def) : LOCKED_SHIELD;

  return (
    <View style={styles.card}>
      <View style={styles.shieldWrap}>
        <Image
          source={shield}
          style={styles.shield}
          resizeMode="contain"
        />
        {!earned && (
          <View style={styles.lockOverlay}>
            <Icon name="lock" size={Math.round(SHIELD_W * 0.32)} color="#4A4A6A" />
          </View>
        )}
      </View>
      <Text style={[styles.name, !earned && styles.nameLocked]} numberOfLines={2}>
        {earned ? def.name : '???'}
      </Text>
      {earned && earnedDate ? (
        <Text style={styles.date}>
          {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#0E0E1C',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#141426',
  },
  shieldWrap: {
    width: SHIELD_W,
    height: SHIELD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: SHIELD_W,
    height: SHIELD_H,
  },
  lockOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  nameLocked: {
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
});
