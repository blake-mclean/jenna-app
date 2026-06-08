import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, FONT, SPACING, RADIUS } from '../constants/theme';

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  color?: string;
  unit?: string;
}

export function BarChart({ data, height = 160, color = COLORS.primary, unit = '' }: Props) {
  const { width } = Dimensions.get('window');
  const chartW = width - SPACING.md * 4;
  const paddingLeft = 32;
  const paddingBottom = 24;
  const chartH = height - paddingBottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (chartW - paddingLeft) / data.length - 6;

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width={chartW} height={height}>
        <Defs>
          <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.3" />
          </SvgGradient>
        </Defs>

        {/* Y-axis grid */}
        {[0, 0.5, 1].map((frac, i) => {
          const y = chartH - frac * chartH;
          return (
            <React.Fragment key={i}>
              <Line x1={paddingLeft} y1={y} x2={chartW} y2={y} stroke={COLORS.border} strokeWidth={1} strokeDasharray="4,4" />
              <SvgText x={paddingLeft - 4} y={y + 4} fill={COLORS.textTertiary} fontSize={9} textAnchor="end">
                {Math.round(maxVal * frac)}{unit}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * chartH;
          const x = paddingLeft + i * ((chartW - paddingLeft) / data.length) + 3;
          const y = chartH - barH;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill="url(#barGrad)"
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 4}
                fill={COLORS.textSecondary}
                fontSize={9}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.sm,
  },
});
