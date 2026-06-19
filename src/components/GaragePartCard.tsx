import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { GaragePartDef } from '../constants/garage';
import { GarageState, GaragePartId } from '../types';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';
import { Icon } from './Icon';

const TIER_COLORS = ['#6A6A8A', '#00D4AA', '#4488FF', '#9B6DFF', '#FFD700'];

// Tier thumbnail images — isolated for frame & drivetrain; scene for wheels & handlebars
const TIER_THUMBS: Record<GaragePartId, any[]> = {
  frame: [
    require('../../assets/images/bike/frame_iso_t0.png'),
    require('../../assets/images/bike/frame_iso_t1.png'),
    require('../../assets/images/bike/frame_iso_t2.png'),
    require('../../assets/images/bike/frame_iso_t3.png'),
    require('../../assets/images/bike/frame_iso_t4.png'),
  ],
  wheels: [
    require('../../assets/images/bike/wheels_iso_t0.png'),
    require('../../assets/images/bike/wheels_iso_t1.png'),
    require('../../assets/images/bike/wheels_iso_t2.png'),
    require('../../assets/images/bike/wheels_iso_t3.png'),
    require('../../assets/images/bike/wheels_iso_t4.png'),
  ],
  handlebars: [
    require('../../assets/images/bike/handlebars_iso_t0.png'),
    require('../../assets/images/bike/handlebars_iso_t1.png'),
    require('../../assets/images/bike/handlebars_iso_t2.png'),
    require('../../assets/images/bike/handlebars_iso_t3.png'),
    require('../../assets/images/bike/handlebars_iso_t4.png'),
  ],
  drivetrain: [
    require('../../assets/images/bike/drivetrain_iso_t0.png'),
    require('../../assets/images/bike/drivetrain_iso_t1.png'),
    require('../../assets/images/bike/drivetrain_iso_t2.png'),
    require('../../assets/images/bike/drivetrain_iso_t3.png'),
    require('../../assets/images/bike/drivetrain_iso_t4.png'),
  ],
};

// All parts now use isolated transparent-bg images
const ISO_PARTS: GaragePartId[] = ['frame', 'wheels', 'handlebars', 'drivetrain'];

interface Props {
  part: GaragePartDef;
  garage: GarageState;
  currentXp: number;
  onPurchase: (tier: number) => void;
  onEquip: (tier: number) => void;
}

export function GaragePartCard({ part, garage, currentXp, onPurchase, onEquip }: Props) {
  const owned    = garage.owned[part.id]    ?? 0;
  const equipped = garage.equipped[part.id] ?? 0;
  const isIso    = ISO_PARTS.includes(part.id);

  return (
    <View style={styles.container}>
      {part.tiers.map((tier) => {
        const isOwned    = tier.tier <= owned;
        const isEquipped = tier.tier === equipped;
        const isFree     = tier.tier === 0;
        const canAfford  = currentXp >= tier.cost;
        const isNext     = tier.tier === owned + 1;
        const tierColor  = TIER_COLORS[tier.tier];
        const thumbImg   = TIER_THUMBS[part.id][tier.tier];

        return (
          <View
            key={tier.tier}
            style={[styles.row, isEquipped && styles.rowEquipped]}
          >
            {/* Tier thumbnail */}
            <View style={[
              styles.thumb,
              { borderColor: tierColor },
              isIso && styles.thumbIsoBg,
            ]}>
              <Image
                source={thumbImg}
                style={styles.thumbImg}
                resizeMode={isIso ? 'contain' : 'cover'}
              />
            </View>

            {/* Name + description */}
            <View style={styles.info}>
              <Text style={[styles.tierName, isEquipped && styles.tierNameEquipped]}>
                {tier.name}
              </Text>
              <Text style={styles.tierDesc}>{tier.description}</Text>
            </View>

            {/* Right action */}
            {isFree ? (
              isEquipped ? (
                <View style={styles.equippedBadge}>
                  <Icon name="check" size={12} color={COLORS.primary} />
                  <Text style={styles.equippedText}>On</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.equipBtn} onPress={() => onEquip(0)}>
                  <Text style={styles.equipBtnText}>Equip</Text>
                </TouchableOpacity>
              )
            ) : isOwned ? (
              isEquipped ? (
                <View style={styles.equippedBadge}>
                  <Icon name="check" size={12} color={COLORS.primary} />
                  <Text style={styles.equippedText}>On</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.equipBtn} onPress={() => onEquip(tier.tier)}>
                  <Text style={styles.equipBtnText}>Equip</Text>
                </TouchableOpacity>
              )
            ) : isNext ? (
              <View style={styles.unlockWrap}>
                <TouchableOpacity
                  style={[styles.unlockBtn, !canAfford && styles.unlockBtnDisabled]}
                  onPress={() => canAfford && onPurchase(tier.tier)}
                  activeOpacity={canAfford ? 0.7 : 1}
                >
                  <Text style={[styles.unlockBtnText, !canAfford && styles.unlockBtnTextDisabled]}>
                    {tier.cost.toLocaleString()} XP
                  </Text>
                </TouchableOpacity>
                {!canAfford && (
                  <Text style={styles.deficitText}>
                    Need {(tier.cost - currentXp).toLocaleString()} more
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.lockedBadge}>
                <Icon name="lock" size={12} color={COLORS.textTertiary} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0E0E1C',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  rowEquipped: {
    borderColor: 'rgba(0,212,170,0.4)',
    backgroundColor: 'rgba(0,212,170,0.06)',
  },
  thumb: {
    width: 56,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbIsoBg: {
    backgroundColor: '#0A0A18',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  tierName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  tierNameEquipped: {
    color: COLORS.primary,
  },
  tierDesc: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  equippedText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  equipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#3A3A58',
  },
  equipBtnText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  unlockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  unlockBtnDisabled: {
    backgroundColor: '#1E1E30',
  },
  unlockBtnText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: '#000',
  },
  unlockBtnTextDisabled: {
    color: COLORS.textTertiary,
  },
  lockedBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: '#0A0A18',
    alignItems: 'center',
    justifyContent: 'center',
  },

  unlockWrap: {
    alignItems: 'center',
    gap: 3,
  },
  deficitText: {
    fontSize: 9,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
