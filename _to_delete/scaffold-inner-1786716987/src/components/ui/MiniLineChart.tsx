interface Series {
  points: string;
  stroke: string;
  strokeWidth?: number;
  fill?: string;
}

interface MiniLineChartProps {
  height?: number;
  series: Series[];
}

/** Matches the inline-SVG polyline/polygon charts used throughout Backoffice.dc.html. */
export function MiniLineChart({ height = 140, series }: MiniLineChartProps) {
  return (
    <svg viewBox={`0 0 400 ${height}`} style={{ width: "100%", height }}>
      {series.map((s) => (
        <g key={s.points}>
          {s.fill && (
            <polygon points={`${s.points} 400,${height} 0,${height}`} fill={s.fill} />
          )}
          <polyline
            points={s.points}
            fill="none"
            stroke={s.stroke}
            strokeWidth={s.strokeWidth ?? 2.5}
          />
        </g>
      ))}
    </svg>
  );
}

export default MiniLineChart;
