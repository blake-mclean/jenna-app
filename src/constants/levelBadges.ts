export interface LevelBadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocksAtLevel: number;
}

// Thresholds: 20, 50, 95, 163, 264, 416, 644, 986, 1499, 2268, 3421, 5151, 7746, 11639 mi
export const LEVEL_BADGE_DEFS: LevelBadgeDef[] = [
  {
    id: 'sprout',
    name: 'Sprout',
    icon: '🌱',
    description: 'First 20 miles logged',
    unlocksAtLevel: 2,
  },
  {
    id: 'road-runner',
    name: 'Road Runner',
    icon: '🛣️',
    description: '50 miles on the odometer',
    unlocksAtLevel: 3,
  },
  {
    id: 'century-chaser',
    name: 'Century Chaser',
    icon: '💯',
    description: 'Nearly 100 miles logged',
    unlocksAtLevel: 4,
  },
  {
    id: 'rising-star',
    name: 'Rising Star',
    icon: '⭐',
    description: 'Crossed the 163-mile mark',
    unlocksAtLevel: 5,
  },
  {
    id: 'iron-cyclist',
    name: 'Iron Cyclist',
    icon: '💪',
    description: '264 miles of pure grit',
    unlocksAtLevel: 6,
  },
  {
    id: 'hill-climber',
    name: 'Hill Climber',
    icon: '⛰️',
    description: '416 miles and still climbing',
    unlocksAtLevel: 7,
  },
  {
    id: 'breakaway',
    name: 'Breakaway',
    icon: '💨',
    description: 'Breaking away from the pack at 644 mi',
    unlocksAtLevel: 8,
  },
  {
    id: 'iron-legs',
    name: 'Iron Legs',
    icon: '🔥',
    description: 'Nearly 1,000 miles of riding',
    unlocksAtLevel: 9,
  },
  {
    id: 'grand-fondo',
    name: 'Grand Fondo',
    icon: '🏅',
    description: '1,499 miles — you\'re the real deal',
    unlocksAtLevel: 10,
  },
  {
    id: 'peloton-pro',
    name: 'Peloton Pro',
    icon: '⚡',
    description: 'Riding with the pros at 2,268 mi',
    unlocksAtLevel: 11,
  },
  {
    id: 'tour-contender',
    name: 'Tour Contender',
    icon: '🏆',
    description: 'Over 3,421 miles — Grand Tour territory',
    unlocksAtLevel: 12,
  },
  {
    id: 'elite-cyclist',
    name: 'Elite Cyclist',
    icon: '💫',
    description: '5,151 miles — elite tier',
    unlocksAtLevel: 13,
  },
  {
    id: 'champion',
    name: 'Champion',
    icon: '👑',
    description: '7,746 miles — a true champion',
    unlocksAtLevel: 14,
  },
  {
    id: 'legend',
    name: 'Legend',
    icon: '🌌',
    description: 'Over 11,639 miles. You are a legend.',
    unlocksAtLevel: 15,
  },
];
