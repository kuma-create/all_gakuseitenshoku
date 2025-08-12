import React from 'react';

interface CareerRadarChartProps {
  data: {
    Communication: number;
    Logic: number;
    Leadership: number;
    Fit: number;
    Vitality: number;
  };
}

export function CareerRadarChart({ data }: CareerRadarChartProps) {
  const maxValue = 100;
  const center = 150;
  const radius = 100;
  
  const skills = Object.keys(data) as Array<keyof typeof data>;
  const values = Object.values(data);
  
  // Calculate points for each skill
  const points = skills.map((skill, index) => {
    const angle = (index * 2 * Math.PI) / skills.length - Math.PI / 2;
    const value = data[skill];
    const r = (value / maxValue) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, skill, value, angle };
  });

  // Create grid circles
  const gridCircles = [20, 40, 60, 80, 100].map(percent => ({
    radius: (percent / 100) * radius,
    percent
  }));

  // Create axis lines
  const axisLines = points.map(point => ({
    x2: center + radius * Math.cos(point.angle),
    y2: center + radius * Math.sin(point.angle),
    skill: point.skill
  }));

  // Create data polygon path
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ') + ' Z';

  return (
    <div className="flex justify-center">
      <svg width="300" height="300" className="drop-shadow-sm">
        {/* Grid circles */}
        {gridCircles.map(({ radius: r, percent }) => (
          <circle
            key={percent}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={line.x2}
            y2={line.y2}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <path
          d={pathData}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3B82F6"
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Skill labels */}
        {points.map((point, index) => {
          const labelRadius = radius + 25;
          const labelX = center + labelRadius * Math.cos(point.angle);
          const labelY = center + labelRadius * Math.sin(point.angle);
          
          return (
            <text
              key={index}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-medium fill-gray-700"
            >
              {point.skill}
            </text>
          );
        })}

        {/* Center circle */}
        <circle
          cx={center}
          cy={center}
          r="3"
          fill="#6B7280"
        />
      </svg>
    </div>
  );
}