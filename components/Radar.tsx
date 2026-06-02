// Pure-SVG hexagon radar chart for player attributes.
const LABELS = ["速度", "射门", "传球", "盘带", "防守", "身体"];

export function Radar({ values, size = 220 }: { values: number[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = 6;
  const pt = (i: number, frac: number) => {
    const ang = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / n;
    return [cx + r * frac * Math.cos(ang), cy + r * frac * Math.sin(ang)];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = (frac: number) =>
    Array.from({ length: n }, (_, i) => pt(i, frac).join(",")).join(" ");
  const dataPoly = values
    .map((v, i) => pt(i, Math.max(0.05, v / 100)).join(","))
    .join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((f) => (
        <polygon
          key={f}
          points={poly(f)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" />;
      })}
      <polygon
        points={dataPoly}
        fill="rgba(245,197,24,0.22)"
        stroke="#f5c518"
        strokeWidth={2}
      />
      {values.map((v, i) => {
        const [x, y] = pt(i, Math.max(0.05, v / 100));
        return <circle key={i} cx={x} cy={y} r={3} fill="#ffd84d" />;
      })}
      {LABELS.map((lab, i) => {
        const [x, y] = pt(i, 1.18);
        return (
          <text
            key={lab}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="rgba(255,255,255,0.65)"
          >
            {lab}
          </text>
        );
      })}
    </svg>
  );
}
