/**
 * 7-day price sparkline. No axes, no labels, no legend: a sparkline's job is
 * shape, and the precise value sits in the adjacent table cell.
 */
interface SparklineProps {
  values: number[];
  /** Direction of the window, which picks the signal colour. */
  positive: boolean;
  width?: number;
  height?: number;
}

export default function Sparkline({
  values,
  positive,
  width = 96,
  height = 28,
}: SparklineProps) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  // 1px inset top and bottom so the stroke is never clipped at the extremes.
  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 1 - ((value - min) / span) * (height - 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points.join(" ")}
        stroke={positive ? "var(--color-up)" : "var(--color-down)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
