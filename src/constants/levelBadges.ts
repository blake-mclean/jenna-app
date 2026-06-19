export interface LevelBadgeDef {
  id: string;
  name: string;
  image: number;
  description: string;
  unlocksAtLevel: number;
}

// Thresholds: 0, 20, 50, 95, 163, 264, 416, 644, 986, 1499, 2268, 3421, 5151, 7746, 11639 mi
export const LEVEL_BADGE_DEFS: LevelBadgeDef[] = [
  {
    id: 'sprout',
    name: 'Sprout',
    image: require('../../assets/images/badge-level-01.png'),
    description: 'Welcome — your journey begins',
    unlocksAtLevel: 1,
  },
  {
    id: 'road-runner',
    name: 'Road Runner',
    image: require('../../assets/images/badge-level-02.png'),
    description: '20 miles on the odometer',
    unlocksAtLevel: 2,
  },
  {
    id: 'pacesetter',
    name: 'Pacesetter',
    image: require('../../assets/images/badge-level-03.png'),
    description: 'Setting your pace at 50 miles',
    unlocksAtLevel: 3,
  },
  {
    id: 'pathfinder',
    name: 'Pathfinder',
    image: require('../../assets/images/badge-level-04.png'),
    description: 'Blazing new trails at 95 miles',
    unlocksAtLevel: 4,
  },
  {
    id: 'gold-finisher',
    name: 'Gold Finisher',
    image: require('../../assets/images/badge-level-05.png'),
    description: '163 miles — podium worthy',
    unlocksAtLevel: 5,
  },
  {
    id: 'night-rider',
    name: 'Night Rider',
    image: require('../../assets/images/badge-level-06.png'),
    description: '264 miles under the stars',
    unlocksAtLevel: 6,
  },
  {
    id: 'guardian',
    name: 'Guardian',
    image: require('../../assets/images/badge-level-07.png'),
    description: '416 miles — built like armor',
    unlocksAtLevel: 7,
  },
  {
    id: 'navigator',
    name: 'Navigator',
    image: require('../../assets/images/badge-level-08.png'),
    description: '644 miles — you know every route',
    unlocksAtLevel: 8,
  },
  {
    id: 'iron-corps',
    name: 'Iron Corps',
    image: require('../../assets/images/badge-level-09.png'),
    description: 'Nearly 1,000 miles — elite rank',
    unlocksAtLevel: 9,
  },
  {
    id: 'royal-rider',
    name: 'Royal Rider',
    image: require('../../assets/images/badge-level-10.png'),
    description: '1,499 miles — you ride like royalty',
    unlocksAtLevel: 10,
  },
  {
    id: 'grand-fondo',
    name: 'Grand Fondo',
    image: require('../../assets/images/badge-level-13.png'),
    description: '2,268 miles — Grand Tour territory',
    unlocksAtLevel: 11,
  },
  {
    id: 'summit-king',
    name: 'Summit King',
    image: require('../../assets/images/badge-level-12.png'),
    description: '3,421 miles — conquered every peak',
    unlocksAtLevel: 12,
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    image: require('../../assets/images/badge-level-11.png'),
    description: '5,151 miles — reborn through fire',
    unlocksAtLevel: 13,
  },
  {
    id: 'star-voyager',
    name: 'Star Voyager',
    image: require('../../assets/images/badge-level-14.png'),
    description: '7,746 miles — charting your own stars',
    unlocksAtLevel: 14,
  },
  {
    id: 'legend',
    name: 'Legend',
    image: require('../../assets/images/badge-level-15.png'),
    description: 'Over 11,639 miles. You are a legend.',
    unlocksAtLevel: 15,
  },
];
