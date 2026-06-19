import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { GarageState } from '../types';
import { EMPTY_GARAGE } from '../constants/garage';

const SW = Dimensions.get('window').width;
const CW = SW - 32;
const CH = Math.round(CW * (941 / 1672));

// One complete assembled bike scene per tier level (0 = stock, 4 = elite)
const BIKE_SCENES = [
  require('../../assets/images/bike/frame_scene_t0.png'),
  require('../../assets/images/bike/frame_scene_t1.png'),
  require('../../assets/images/bike/frame_scene_t2.png'),
  require('../../assets/images/bike/frame_scene_t3.png'),
  require('../../assets/images/bike/frame_scene_t4.png'),
];

interface Props {
  garage: GarageState;
}

export function BikeDisplay({ garage }: Props) {
  const eq = garage?.equipped ?? EMPTY_GARAGE.equipped;
  // Bike level = highest tier across all equipped parts
  const level = Math.max(eq.frame ?? 0, eq.wheels ?? 0, eq.handlebars ?? 0, eq.drivetrain ?? 0);

  return (
    <View style={styles.canvas}>
      <Image source={BIKE_SCENES[level]} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: CW,
    height: CH,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  image: {
    width: CW,
    height: CH,
  },
});
