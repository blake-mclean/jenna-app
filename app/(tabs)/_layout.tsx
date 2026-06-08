import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONT } from '@/constants/theme';

// ─── Icons ────────────────────────────────────────────────────────────────────

const SZ = 24;
const SW = 1.9; // default stroke width

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11L12 4L21 11V20C21 20.55 20.55 21 20 21H15.5V15.5H8.5V21H4C3.45 21 3 20.55 3 20V11Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StatsIcon({ color }: { color: string }) {
  // Four bars — thick rounded lines, tallest on the right
  return (
    <Svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 20V14" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
      <Path d="M9.5 20V8"  stroke={color} strokeWidth={2.8} strokeLinecap="round" />
      <Path d="M14.5 20V12" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
      <Path d="M19.5 20V5"  stroke={color} strokeWidth={2.8} strokeLinecap="round" />
    </Svg>
  );
}

function TrophyIcon({ color }: { color: string }) {
  return (
    <Svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none">
      {/* Cup body */}
      <Path
        d="M8 3H16L14.5 13C14.1 15.3 13.2 17 12 17C10.8 17 9.9 15.3 9.5 13L8 3Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Left handle */}
      <Path
        d="M8 5H5C5 9 6 12 8 12"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right handle */}
      <Path
        d="M16 5H19C19 9 18 12 16 12"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stem */}
      <Path d="M12 17V19.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      {/* Crossbar */}
      <Path d="M8.5 19.5H15.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      {/* Base */}
      <Path d="M7 21.5H17" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={SW} />
      <Path
        d="M4.5 20C4.5 16.7 7.9 14 12 14C16.1 14 19.5 16.7 19.5 20"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Tab item ─────────────────────────────────────────────────────────────────

type TabName = 'home' | 'stats' | 'compete' | 'profile';

interface TabIconProps {
  name: TabName;
  label: string;
  focused: boolean;
}

function TabIcon({ name, label, focused }: TabIconProps) {
  const color = focused ? COLORS.primary : COLORS.textTertiary;
  return (
    <View style={styles.tab}>
      {name === 'home'    && <HomeIcon    color={color} />}
      {name === 'stats'   && <StatsIcon   color={color} />}
      {name === 'compete' && <TrophyIcon  color={color} />}
      {name === 'profile' && <PersonIcon  color={color} />}
      <Text
        style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="stats" label="Stats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="compete" label="Compete" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="profile" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 80,
  },
  label: {
    fontSize: 10,
    fontWeight: FONT.weight.medium,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },
  labelInactive: {
    color: COLORS.textTertiary,
  },
});
