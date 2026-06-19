import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

export type IconName =
  | 'arrow-up' | 'bell' | 'bicycle' | 'calendar' | 'check'
  | 'clock' | 'comet' | 'crown' | 'flag' | 'flame'
  | 'galaxy' | 'gear' | 'globe' | 'lightning' | 'list'
  | 'lock' | 'medal' | 'moon' | 'mountain' | 'muscle'
  | 'pencil' | 'phone' | 'road' | 'route' | 'runner'
  | 'shield' | 'sparkle' | 'sprout' | 'star' | 'sunrise'
  | 'target' | 'tree' | 'trophy' | 'warning' | 'wind' | 'wrench';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

const SW = 1.9;
const RC = 'round' as const;

export function Icon({ name, size = 24, color = '#FFFFFF' }: Props) {
  const p = { stroke: color, strokeWidth: SW, strokeLinecap: RC, strokeLinejoin: RC, fill: 'none' };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {render(name, p, color)}
    </Svg>
  );
}

function render(name: IconName, p: ReturnType<typeof makeProps>, color: string) {
  switch (name) {
    case 'check':
      return <Path {...p} d="M5 13L9 17L19 7" />;

    case 'lightning':
      return <Path {...p} d="M13 2L5 13H12L11 22L19 11H12Z" />;

    case 'list':
      return (
        <G>
          <Path {...p} d="M9 6H20" />
          <Path {...p} d="M9 12H20" />
          <Path {...p} d="M9 18H20" />
          <Path {...p} strokeWidth={2.5} d="M4.5 6H4.5" />
          <Path {...p} strokeWidth={2.5} d="M4.5 12H4.5" />
          <Path {...p} strokeWidth={2.5} d="M4.5 18H4.5" />
        </G>
      );

    case 'medal':
      return (
        <G>
          <Circle {...p} cx="12" cy="9" r="5" />
          <Path {...p} d="M7.5 13.5L5 21L9.5 18.5L12 21L14.5 18.5L19 21L16.5 13.5" />
        </G>
      );

    case 'lock':
      return (
        <G>
          <Path {...p} d="M8 11V7A4 4 0 0 1 16 7V11" />
          <Path {...p} d="M5 11H19V21H5V11Z" />
          <Path {...p} d="M12 15V17" />
          <Circle cx="12" cy="14" r="1" fill={color} />
        </G>
      );

    case 'flame':
      return <Path {...p} d="M12 2.5C15.2 5.4 17.5 8.9 17.5 12.5C17.5 17 14.7 20.2 12 21.5C9.3 20.2 6.5 17 6.5 12.5C6.5 10.1 7.7 7.8 9.5 6.1C9.3 8.1 10.1 9.5 11.4 10.4C12.7 8.7 13.1 5.6 12 2.5Z" />;

    case 'clock':
      return (
        <G>
          <Circle {...p} cx="12" cy="12" r="9" />
          <Path {...p} d="M12 7V12L15.5 14.5" />
        </G>
      );

    case 'route':
      return (
        <G>
          {/* Left pin — teardrop, center (5,7), tip (5,15.5) */}
          <Path {...p} d="M5 15.5C2.5 12.5 1 10.5 1 7C1 4 2.5 3 5 3C7.5 3 9 4 9 7C9 10.5 7.5 12.5 5 15.5Z" />
          <Circle cx="5" cy="7" r="1.2" fill={color} />
          {/* Right pin — teardrop, center (17,7), tip (17,15.5) */}
          <Path {...p} d="M17 15.5C14.5 12.5 13 10.5 13 7C13 4 14.5 3 17 3C19.5 3 21 4 21 7C21 10.5 19.5 12.5 17 15.5Z" />
          <Circle cx="17" cy="7" r="1.2" fill={color} />
          {/* Dashed baseline — from tip to tip */}
          <Path {...p} strokeDasharray={[2.5, 2.5]} d="M5 18.5L17 18.5" />
        </G>
      );

    case 'gear': {
      const tAngles = [0, 45, 90, 135, 180, 225, 270, 315];
      return (
        <G>
          <Circle {...p} cx="12" cy="12" r="7.5" />
          {tAngles.map((a) => (
            <G key={a} transform={`rotate(${a}, 12, 12)`}>
              <Path {...p} d="M10.5 4.5V2.5H13.5V4.5" />
            </G>
          ))}
          <Circle {...p} cx="12" cy="12" r="2.8" />
          <Path {...p} d="M12 12V9.5" />
          <Path {...p} d="M12 12L14.2 13.3" />
          <Path {...p} d="M12 12L9.8 13.3" />
        </G>
      );
    }

    case 'wrench':
      return (
        <G>
          <Circle {...p} cx="16.5" cy="7.5" r="3.5" />
          <Path {...p} d="M14 10L4 20" />
        </G>
      );

    case 'star':
      return <Path {...p} d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />;

    case 'calendar':
      return (
        <G>
          <Path {...p} d="M3 5H21V21H3V5Z" />
          <Path {...p} d="M3 10H21" />
          <Path {...p} d="M8 3V7" />
          <Path {...p} d="M16 3V7" />
        </G>
      );

    case 'arrow-up':
      return (
        <G>
          <Path {...p} d="M12 19V5" />
          <Path {...p} d="M5 12L12 5L19 12" />
        </G>
      );

    case 'globe':
      return (
        <G>
          <Circle {...p} cx="12" cy="12" r="9" />
          <Path {...p} d="M12 3C10 7 10 17 12 21C14 17 14 7 12 3Z" />
          <Path {...p} d="M3 12H21" />
          <Path {...p} d="M4.5 7.5H19.5" />
          <Path {...p} d="M4.5 16.5H19.5" />
        </G>
      );

    case 'mountain':
      return <Path {...p} d="M3 21L9 9L13 15L16 10L21 21H3Z" />;

    case 'trophy':
      return (
        <G>
          <Path {...p} d="M8 3H16L14.5 13C14.1 15.3 13.2 17 12 17C10.8 17 9.9 15.3 9.5 13L8 3Z" />
          <Path {...p} d="M8 5H5C5 9 6 12 8 12" />
          <Path {...p} d="M16 5H19C19 9 18 12 16 12" />
          <Path {...p} d="M12 17V19.5" />
          <Path {...p} d="M8.5 19.5H15.5" />
          <Path {...p} d="M7 21.5H17" />
        </G>
      );

    case 'bicycle':
      return (
        <G>
          <Circle {...p} cx="6" cy="17" r="4" />
          <Circle {...p} cx="18" cy="17" r="4" />
          <Path {...p} d="M6 17L10 10H16L18 17M10 10L18 17" />
          <Path {...p} d="M16 10L19 9" />
          <Path {...p} d="M10 10L8 8H12" />
        </G>
      );

    case 'runner':
      return (
        <G>
          {/* Head */}
          <Circle {...p} fill={color} stroke="none" cx="15" cy="4" r="2.8" />
          {/* Torso: shoulder → hip, forward lean */}
          <Path {...p} strokeWidth={2.2} d="M13 7L9 14" />
          {/* Forward arm: shoulder → elbow (right-down) → fist (right-up) — bent */}
          <Path {...p} strokeWidth={2.2} d="M13 7L18 10L21 6" />
          {/* Back arm: shoulder → elbow (left, raised) → forearm (down) — bent */}
          <Path {...p} strokeWidth={2.2} d="M13 7L8 8.5L6.5 12.5" />
          {/* Front leg: hip → knee (forward, higher) → foot (down-back) — more bent */}
          <Path {...p} strokeWidth={2.2} d="M9 14L14 17L13 22" />
          {/* Back leg: hip → knee (back-down) → foot (back-up) — bent */}
          <Path {...p} strokeWidth={2.2} d="M9 14L6 19L2 15" />
        </G>
      );

    case 'pencil':
      return (
        <G>
          <Path {...p} d="M17.5 2.5A2.121 2.121 0 0 1 20.5 5.5L7 19L3 21L5 17L17.5 2.5Z" />
          <Path {...p} d="M15 5L19 9" />
        </G>
      );

    case 'muscle':
      return (
        <G>
          <Path {...p} strokeWidth={2.8} d="M6.5 9V15" />
          <Path {...p} strokeWidth={2.8} d="M17.5 9V15" />
          <Path {...p} d="M6.5 12H17.5" />
          <Path {...p} strokeWidth={2.8} d="M4 10V14" />
          <Path {...p} strokeWidth={2.8} d="M20 10V14" />
        </G>
      );

    case 'wind':
      return (
        <G>
          <Path {...p} d="M3 8H16C18.2 8 20 9.8 20 12C20 14.2 18.2 16 16 16H12" />
          <Path {...p} d="M3 12H11" />
          <Path {...p} d="M3 16H8C9.1 16 10 16.9 10 18C10 19.1 9.1 20 8 20H5" />
        </G>
      );

    case 'sunrise':
      return (
        <G>
          <Path {...p} d="M2 17H22" />
          <Path {...p} d="M7 17A5 5 0 0 1 17 17" />
          <Path {...p} d="M12 8V11" />
          <Path {...p} d="M4.9 11.5L6.5 13.1" />
          <Path {...p} d="M19.1 11.5L17.5 13.1" />
        </G>
      );

    case 'moon':
      return <Path {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />;

    case 'road':
      return (
        <G>
          <Path {...p} d="M4 22L9 4H15L20 22" />
          <Path {...p} d="M12 8V10" />
          <Path {...p} d="M12 13V15" />
          <Path {...p} d="M12 18V20" />
        </G>
      );

    case 'flag':
      return (
        <G>
          <Path {...p} d="M5 3V21" />
          <Path {...p} d="M5 3H19L15 9H19L15 15H5" />
        </G>
      );

    case 'crown':
      return (
        <G>
          <Path {...p} d="M2 19H22" />
          <Path {...p} d="M2 19L5 10L9 15.5L12 7L15 15.5L19 10L22 19" />
        </G>
      );

    case 'sprout':
      return (
        <G>
          <Path {...p} d="M12 22V12" />
          <Path {...p} d="M12 12C12 12 7 9 7 5C9 3 12 6 12 12" />
          <Path {...p} d="M12 12C12 12 17 9 17 5C15 3 12 6 12 12" />
        </G>
      );

    case 'comet':
      return (
        <G>
          <Circle {...p} cx="17" cy="7" r="3" />
          <Path {...p} d="M14.5 9.5L3 21" />
          <Path {...p} d="M11.5 11.5L5 18" />
        </G>
      );

    case 'galaxy':
      return <Path {...p} d="M12 2L13.5 8.5L20 7L15.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L8.5 12L4 7L10.5 8.5L12 2Z" />;

    case 'tree':
      return (
        <G>
          <Path {...p} d="M10 22H14V19" />
          <Path {...p} d="M5 19H19L12 8Z" />
          <Path {...p} d="M7 13H17L12 5Z" />
        </G>
      );

    case 'shield':
      return <Path {...p} d="M12 2L3 6.5V12C3 16.97 7.02 21.27 12 22C16.98 21.27 21 16.97 21 12V6.5L12 2Z" />;

    case 'bell':
      return (
        <G>
          <Path {...p} d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
          <Path {...p} d="M13.73 21A2 2 0 0 1 10.27 21" />
        </G>
      );

    case 'phone':
      return <Path {...p} d="M5 4H9L11 9L8.5 10.5C9.57 12.6 11.4 14.43 13.5 15.5L15 13L20 15V19C20 19.55 19.55 20 19 20C10.16 20 3 12.84 3 4C3 3.45 3.45 3 4 3H8" />;

    case 'sparkle':
      return <Path {...p} d="M12 2V7M12 17V22M2 12H7M17 12H22M4.93 4.93L8.46 8.46M15.54 15.54L19.07 19.07M19.07 4.93L15.54 8.46M8.46 15.54L4.93 19.07" />;

    case 'target':
      return (
        <G>
          <Circle {...p} cx="12" cy="12" r="9" />
          <Circle {...p} cx="12" cy="12" r="5" />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
        </G>
      );

    case 'warning':
      return (
        <G>
          <Path {...p} d="M10.29 3.86L1.82 18A2 2 0 0 0 3.64 21H20.36A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" />
          <Path {...p} d="M12 9V13" />
          <Circle cx="12" cy="17" r="0.8" fill={color} />
        </G>
      );

    default:
      return null;
  }
}

function makeProps(color: string) {
  return { stroke: color, strokeWidth: SW, strokeLinecap: RC, strokeLinejoin: RC, fill: 'none' };
}
