import { GaragePartId, GarageState } from '../types';

export interface GarageTierDef {
  tier: number;
  name: string;
  cost: number;           // XP cost (0 = free default)
  xpMultiplier: number;   // additive bonus, e.g. 0.05 = +5% XP
  description: string;
}

export interface GaragePartDef {
  id: GaragePartId;
  name: string;
  tiers: GarageTierDef[];
}

export const GARAGE_PARTS: GaragePartDef[] = [
  {
    id: 'frame',
    name: 'Frame',
    tiers: [
      { tier: 0, name: 'Stock Alloy',    cost: 0,    xpMultiplier: 0,    description: 'Standard aluminum alloy frame.' },
      { tier: 1, name: 'Alloy Sport',    cost: 200,  xpMultiplier: 0.02, description: '6061 alloy with stiffer welds. +2% XP' },
      { tier: 2, name: 'Carbon Sport',   cost: 500,  xpMultiplier: 0.05, description: 'Carbon fibre with aero tube shaping. +5% XP' },
      { tier: 3, name: 'Pro Carbon',     cost: 1200, xpMultiplier: 0.10, description: 'Race-tuned carbon, integrated routing. +10% XP' },
      { tier: 4, name: 'Aero Carbon',    cost: 3000, xpMultiplier: 0.15, description: 'UCI wind-tunnel aero frame. +15% XP' },
    ],
  },
  {
    id: 'wheels',
    name: 'Wheels',
    tiers: [
      { tier: 0, name: 'Stock 32H',      cost: 0,    xpMultiplier: 0,    description: 'Standard 32-spoke alloy wheels.' },
      { tier: 1, name: 'Alloy 24H',      cost: 200,  xpMultiplier: 0.02, description: 'Lighter 24-spoke alloy wheelset. +2% XP' },
      { tier: 2, name: 'Deep-Rim 38mm',  cost: 500,  xpMultiplier: 0.05, description: '38mm carbon aero clincher. +5% XP' },
      { tier: 3, name: 'Carbon 50mm',    cost: 1200, xpMultiplier: 0.10, description: '50mm carbon deep-section aero. +10% XP' },
      { tier: 4, name: 'Carbon Disc',    cost: 3000, xpMultiplier: 0.15, description: 'Full carbon disc for maximum aero. +15% XP' },
    ],
  },
  {
    id: 'handlebars',
    name: 'Handlebars',
    tiers: [
      { tier: 0, name: 'Flat Bar',       cost: 0,    xpMultiplier: 0,    description: 'Basic flat handlebar.' },
      { tier: 1, name: 'Sport Flat',     cost: 200,  xpMultiplier: 0.02, description: 'Ergonomic flat bar with back sweep. +2% XP' },
      { tier: 2, name: 'Drop Bar',       cost: 500,  xpMultiplier: 0.05, description: 'Classic road drop bars. +5% XP' },
      { tier: 3, name: 'Aero Drop',      cost: 1200, xpMultiplier: 0.10, description: 'Compact shallow-drop aero bars. +10% XP' },
      { tier: 4, name: 'TT Aero',        cost: 3000, xpMultiplier: 0.15, description: 'Time-trial extension bars. +15% XP' },
    ],
  },
  {
    id: 'drivetrain',
    name: 'Drivetrain',
    tiers: [
      { tier: 0, name: '7-Speed',          cost: 0,    xpMultiplier: 0,    description: 'Standard 7-speed drivetrain.' },
      { tier: 1, name: '10-Speed Alloy',   cost: 200,  xpMultiplier: 0.02, description: '10-speed alloy groupset. +2% XP' },
      { tier: 2, name: '11-Speed Carbon',  cost: 500,  xpMultiplier: 0.05, description: '11-speed carbon crankset. +5% XP' },
      { tier: 3, name: '12-Speed Di2',     cost: 1200, xpMultiplier: 0.10, description: 'Electronic 12-speed shifting. +10% XP' },
      { tier: 4, name: 'Electronic Pro',   cost: 3000, xpMultiplier: 0.15, description: 'Full electronic + power meter. +15% XP' },
    ],
  },
];

export const EMPTY_GARAGE: GarageState = {
  owned:    { frame: 0, wheels: 0, handlebars: 0, drivetrain: 0 },
  equipped: { frame: 0, wheels: 0, handlebars: 0, drivetrain: 0 },
};

export function getXpMultiplier(garage: GarageState): number {
  let bonus = 0;
  for (const part of GARAGE_PARTS) {
    const tier = garage.equipped[part.id] ?? 0;
    bonus += part.tiers[tier]?.xpMultiplier ?? 0;
  }
  return 1 + bonus;
}
