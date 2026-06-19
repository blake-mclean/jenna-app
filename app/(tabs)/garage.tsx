import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { BikeDisplay } from '@/components/BikeDisplay';
import { GaragePartCard } from '@/components/GaragePartCard';
import { GARAGE_PARTS, getXpMultiplier } from '@/constants/garage';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { GaragePartId } from '@/types';

const PARTS: GaragePartId[] = ['frame', 'wheels', 'handlebars', 'drivetrain'];
const PART_IMAGES: Record<GaragePartId, any> = {
  frame:       require('../../assets/images/part-frame.png'),
  wheels:      require('../../assets/images/part-wheels.png'),
  handlebars:  require('../../assets/images/part-handlebars.png'),
  drivetrain:  require('../../assets/images/part-drivetrain.png'),
};

export default function GarageScreen() {
  const { data, sportData, purchaseUpgrade, equipUpgrade } = useApp();
  const activeSport = data.profile.activeSport ?? 'cycling';
  const garage      = sportData.garage;
  const xp          = sportData.xp ?? 0;
  const totalXp     = sportData.totalXpEarned ?? 0;
  const multiplier  = getXpMultiplier(garage);
  const bonusPct    = Math.round((multiplier - 1) * 100);

  const [selectedPart, setSelectedPart] = useState<GaragePartId>('frame');

  const activePart = GARAGE_PARTS.find((p) => p.id === selectedPart)!;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Garage</Text>
          <View style={styles.xpRow}>
            <View style={styles.xpBadge}>
              <Icon name="lightning" size={14} color={COLORS.primary} />
              <Text style={styles.xpValue}>{xp.toLocaleString()} XP</Text>
            </View>
            {bonusPct > 0 && (
              <View style={styles.multiplierBadge}>
                <Text style={styles.multiplierText}>+{bonusPct}% XP</Text>
              </View>
            )}
          </View>
          <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP earned all-time</Text>
        </View>

        {/* ── Bike display ────────────────────────────────────────────────── */}
        <View style={styles.bikeCard}>
          <BikeDisplay garage={garage} />
        </View>

        {/* ── Part selector tabs ──────────────────────────────────────────── */}
        <View style={styles.partTabs}>
          {PARTS.map((partId) => {
            const def      = GARAGE_PARTS.find((p) => p.id === partId)!;
            const equipped = garage.equipped[partId] ?? 0;
            const active   = partId === selectedPart;
            return (
              <TouchableOpacity
                key={partId}
                style={[styles.partTab, active && styles.partTabActive]}
                onPress={() => setSelectedPart(partId)}
              >
                <Image
                  source={PART_IMAGES[partId]}
                  style={[styles.partIcon, active && styles.partIconActive]}
                  resizeMode="contain"
                />
                <Text style={[styles.partTabLabel, active && styles.partTabLabelActive]}>
                  {def.name}
                </Text>
                {equipped > 0 && (
                  <View style={[styles.tierDot, active && styles.tierDotActive]}>
                    <Text style={styles.tierDotText}>{equipped}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Upgrade cards for selected part ─────────────────────────────── */}
        <View style={styles.upgradeSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{activePart.name} Upgrades</Text>
          </View>
          <GaragePartCard
            part={activePart}
            garage={garage}
            currentXp={xp}
            onPurchase={(tier) => purchaseUpgrade(selectedPart, tier)}
            onEquip={(tier) => equipUpgrade(selectedPart, tier)}
          />
        </View>

        {/* ── XP info ─────────────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How to earn XP</Text>
          <View style={styles.infoRow}>
            <Icon name={activeSport === 'running' ? 'runner' : 'bicycle'} size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>1 XP per km logged</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="trophy" size={14} color={COLORS.achievement} />
            <Text style={styles.infoText}>75 XP per achievement</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="flag" size={14} color={COLORS.primary} />
            <Text style={styles.infoText}>50–200 XP per challenge</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.infoText}>100 × level XP on level-up</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  header: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    lineHeight: 32,
    marginBottom: SPACING.sm,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,212,170,0.10)',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  xpValue: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.heavy,
    color: COLORS.primary,
  },
  multiplierBadge: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  multiplierText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: '#FFD700',
  },
  xpTotal: {
    fontSize: FONT.size.xs,
    color: COLORS.textTertiary,
    marginTop: 6,
  },

  bikeCard: {
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderRadius: RADIUS.lg,
  },

  partTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  partTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#0E0E1C',
    borderWidth: 1,
    borderColor: '#1E1E30',
    position: 'relative',
  },
  partTabActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0,212,170,0.07)',
  },
  partIcon: {
    width: 36,
    height: 36,
    opacity: 0.4,
  },
  partIconActive: {
    opacity: 1,
  },
  partTabLabel: {
    fontSize: 10,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textTertiary,
  },
  partTabLabelActive: {
    color: COLORS.primary,
  },
  tierDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3A3A58',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierDotActive: {
    backgroundColor: COLORS.primary,
  },
  tierDotText: {
    fontSize: 8,
    fontWeight: FONT.weight.bold,
    color: '#000',
  },

  upgradeSection: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  infoCard: {
    backgroundColor: '#0E0E1C',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#1E1E30',
    gap: 10,
  },
  infoTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
});
