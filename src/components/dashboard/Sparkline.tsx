/** Tiny dependency-free sparkline / bar chart used inside KPI cards. */
export function Sparkline({
  data,
  color,
  height = 34,
  className,
}: {
  data: number[];
  color: string;
  height?: number;
  className?: string;
}) {
  if (!data.length) return null;
  const w = 100;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${data.length}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Grouped mini bars, e.g. monthly new vs existing customer sales. */
export function MiniBars({
  series,
  height = 56,
  className,
}: {
  series: { label: string; values: { value: number; color: string }[] }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values.map((v) => v.value)));
  return (
    <div className={className}>
      <div className="flex items-end gap-2" style={{ height }}>
        {series.map((s) => (
          <div key={s.label} className="flex flex-1 items-end justify-center gap-[3px]">
            {s.values.map((v, i) => (
              <div
                key={i}
                className="w-full max-w-[10px] rounded-t-[3px] transition-all"
                style={{
                  height: `${Math.max(3, (v.value / max) * height)}px`,
                  background: v.color,
                }}
                title={`${s.label}: ${Math.round(v.value)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {series.map((s) => (
          <div key={s.label} className="flex-1 text-center text-[10px] text-muted-foreground">
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
