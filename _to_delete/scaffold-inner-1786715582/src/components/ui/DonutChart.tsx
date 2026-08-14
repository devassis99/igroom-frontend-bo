interface DonutSlice {
  color: string;
  from: number;
  to: number;
}

interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  innerSize?: number;
}

/** Matches the conic-gradient donut in Backoffice.dc.html's Spending Breakdown card. */
export function DonutChart({ slices, centerLabel, centerValue, size = 130, innerSize = 84 }: DonutChartProps) {
  const gradient = slices.map((s) => `${s.color} ${s.from}% ${s.to}%`).join(", ");

  return (
    <div
      style={{ width: size, height: size, background: `conic-gradient(${gradient})` }}
      className="flex items-center justify-center rounded-full"
    >
      <div
        style={{ width: innerSize, height: innerSize }}
        className="flex flex-col items-center justify-center rounded-full bg-bo-surface"
      >
        <span className="font-sans text-[10px] text-bo-muted-5">{centerLabel}</span>
        <span className="font-sans text-sm font-bold text-bo-ink">{centerValue}</span>
      </div>
    </div>
  );
}

export default DonutChart;
