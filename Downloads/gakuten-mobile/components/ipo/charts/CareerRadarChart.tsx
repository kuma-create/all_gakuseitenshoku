

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

interface CareerRadarChartProps {
  data: {
    Communication: number;
    Logic: number;
    Leadership: number;
    Fit: number;
    Vitality: number;
  };
  /**
   * Overall chart size in pixels (width = height). Defaults to 300 to match WEB baseline.
   */
  size?: number;
}

export function CareerRadarChart({ data, size = 300 }: CareerRadarChartProps) {
  const maxValue = 100;
  const center = size / 2;
  // Keep the same ratio as WEB: radius = 100 when size = 300 -> radius = size * (100/300)
  const radius = (size * 100) / 300;

  const skills = Object.keys(data) as Array<keyof typeof data>;

  const points = skills.map((skill, index) => {
    const angle = (index * 2 * Math.PI) / skills.length - Math.PI / 2;
    const value = data[skill];
    const r = (value / maxValue) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, skill, value, angle };
  });

  const gridPercents = [20, 40, 60, 80, 100];

  const axisLines = points.map((p) => ({
    x2: center + radius * Math.cos(p.angle),
    y2: center + radius * Math.sin(p.angle),
    skill: p.skill,
  }));

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  // Label offset keeps WEB proportion: 25px when size=300
  const labelOffset = (size * 25) / 300;
  const fontSize = Math.max(10, Math.round((size * 12) / 300));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Grid circles */}
        {gridPercents.map((percent) => {
          const r = (percent / 100) * radius;
          return (
            <Circle
              key={`grid-${percent}`}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <Line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={line.x2}
            y2={line.y2}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        ))}

        {/* Data polygon */}
        <Path d={pathData} fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" strokeWidth={2} />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={4} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />)
        )}

        {/* Skill labels */}
        {points.map((p, i) => {
          const lx = center + (radius + labelOffset) * Math.cos(p.angle);
          const ly = center + (radius + labelOffset) * Math.sin(p.angle);
          return (
            <SvgText
              key={`label-${i}`}
              x={lx}
              y={ly}
              fontSize={fontSize}
              fontWeight="500"
              fill="#374151"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {String(p.skill)}
            </SvgText>
          );
        })}

        {/* Center dot */}
        <Circle cx={center} cy={center} r={3} fill="#6B7280" />
      </Svg>
    </View>
  );
}