import type { Shot } from "../lib/mockData";

/* ---------------- Radar (skill ratings) ---------------- */
export function RadarChart({
  data,
  max = 5,
  size = 280,
}: {
  data: { label: string; value: number }[];
  max?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 44;
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, frac: number) => [
    cx + Math.cos(angle(i)) * r * frac,
    cy + Math.sin(angle(i)) * r * frac,
  ];

  const rings = [0.25, 0.5, 0.75, 1];
  const poly = data
    .map((d, i) => point(i, d.value / max).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
      {rings.map((rf, ri) => (
        <polygon
          key={ri}
          points={data.map((_, i) => point(i, rf).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />
        );
      })}
      <polygon points={poly} fill="rgba(163,230,53,0.18)" stroke="var(--primary)" strokeWidth={2} />
      {data.map((d, i) => {
        const [x, y] = point(i, d.value / max);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="var(--primary)" />;
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, 1.22);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11.5}
            fontWeight={700}
            fill="var(--text-muted)"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------------- Donut ---------------- */
export function Donut({
  data,
  size = 180,
  thickness = 26,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return seg;
        })}
      </g>
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        fontSize={26}
        fontWeight={800}
        fill="var(--text)"
      >
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
        shots
      </text>
    </svg>
  );
}

/* ---------------- Court coverage heatmap ---------------- */
export function Heatmap({ grid }: { grid: number[][] }) {
  const rows = grid.length;
  const cols = grid[0].length;
  const w = 220;
  const h = 340;
  const cw = w / cols;
  const ch = h / rows;
  const color = (v: number) => {
    // blue -> green -> yellow -> red
    const stops = [
      [30, 41, 80],
      [56, 189, 248],
      [163, 230, 53],
      [251, 191, 36],
      [248, 113, 113],
    ];
    const x = Math.min(0.999, Math.max(0, v)) * (stops.length - 1);
    const i = Math.floor(x);
    const f = x - i;
    const a = stops[i];
    const b = stops[Math.min(stops.length - 1, i + 1)];
    const m = a.map((c, k) => Math.round(c + (b[k] - c) * f));
    return `rgb(${m[0]},${m[1]},${m[2]})`;
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      {grid.map((r, y) =>
        r.map((v, x) => (
          <rect
            key={`${x}-${y}`}
            x={x * cw}
            y={y * ch}
            width={cw}
            height={ch}
            fill={color(v)}
            opacity={0.35 + v * 0.6}
          />
        ))
      )}
      {/* court outline + kitchen + net */}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#fff" strokeWidth={2.5} />
      <line x1={0} y1={h / 2 - h * 0.16} x2={w} y2={h / 2 - h * 0.16} stroke="rgba(255,255,255,0.6)" strokeDasharray="5 4" />
      <line x1={0} y1={h / 2 + h * 0.16} x2={w} y2={h / 2 + h * 0.16} stroke="rgba(255,255,255,0.6)" strokeDasharray="5 4" />
      <line x1={w / 2} y1={0} x2={w / 2} y2={h / 2 - h * 0.16} stroke="rgba(255,255,255,0.4)" />
      <line x1={w / 2} y1={h / 2 + h * 0.16} x2={w / 2} y2={h} stroke="rgba(255,255,255,0.4)" />
    </svg>
  );
}

/* ---------------- 3D trajectory court ---------------- */
function project(x: number, y: number, w: number, h: number) {
  // perspective trapezoid: far side (y=1) narrower, near side (y=0) wider
  const topY = 30;
  const botY = h - 20;
  const yy = topY + (botY - topY) * y;
  const widthAt = (yp: number) => {
    const t = (yp - topY) / (botY - topY);
    return 0.42 + t * 0.5; // fraction of w
  };
  const half = (widthAt(yy) * w) / 2;
  const xx = w / 2 + (x - 0.5) * 2 * half;
  return [xx, yy];
}

export function TrajectoryMap({
  shots,
  width = 460,
  height = 380,
  highlightType,
}: {
  shots: Shot[];
  width?: number;
  height?: number;
  highlightType?: string;
}) {
  const w = width;
  const h = height;
  const netY = 0.5;
  const [nl] = project(0, netY, w, h);
  const [nr] = project(1, netY, w, h);
  const [, ny] = project(0, netY, w, h);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      <defs>
        <linearGradient id="courtFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15233f" />
          <stop offset="1" stopColor="#1d3357" />
        </linearGradient>
      </defs>
      {/* floor */}
      <polygon
        points={[
          project(0, 0, w, h).join(","),
          project(1, 0, w, h).join(","),
          project(1, 1, w, h).join(","),
          project(0, 1, w, h).join(","),
        ].join(" ")}
        fill="url(#courtFloor)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={2}
      />
      {/* kitchen lines */}
      {[0.34, 0.66].map((ky, i) => {
        const [lx, lyv] = project(0, ky, w, h);
        const [rx] = project(1, ky, w, h);
        return <line key={i} x1={lx} y1={lyv} x2={rx} y2={lyv} stroke="rgba(255,255,255,0.4)" strokeDasharray="5 4" />;
      })}
      {/* net */}
      <line x1={nl} y1={ny - 26} x2={nr} y2={ny - 26} stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
      <line x1={nl} y1={ny} x2={nl} y2={ny - 26} stroke="rgba(255,255,255,0.5)" />
      <line x1={nr} y1={ny} x2={nr} y2={ny - 26} stroke="rgba(255,255,255,0.5)" />
      <rect x={nl} y={ny - 26} width={nr - nl} height={26} fill="rgba(255,255,255,0.06)" />

      {/* shot arcs */}
      {shots.map((s) => {
        const [x1, y1] = project(s.start.x, s.start.y, w, h);
        const [x2, y2] = project(s.end.x, s.end.y, w, h);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - s.arc * 150;
        const active = !highlightType || s.type === highlightType;
        const col =
          s.quality === "Excellent"
            ? "var(--excellent)"
            : s.quality === "Average"
            ? "var(--average)"
            : "var(--poor)";
        return (
          <g key={s.id} opacity={active ? 0.9 : 0.08}>
            <path
              d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
              fill="none"
              stroke={col}
              strokeWidth={active ? 2 : 1}
              strokeLinecap="round"
            />
            <circle cx={x2} cy={y2} r={active ? 3 : 1.5} fill={col} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- Serve / return depth court ---------------- */
export function DepthCourt({
  serveDepth,
  returnDepth,
}: {
  serveDepth: number;
  returnDepth: number;
}) {
  const w = 200;
  const h = 300;
  const courtFt = 22; // half-court depth
  const yFor = (ft: number) => 20 + (h - 40) * (1 - ft / courtFt);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      <rect x={20} y={20} width={w - 40} height={h - 40} fill="#16243f" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      {/* kitchen */}
      <rect x={20} y={20} width={w - 40} height={(h - 40) * 0.32} fill="rgba(129,140,248,0.08)" />
      <line x1={20} y1={20 + (h - 40) * 0.32} x2={w - 20} y2={20 + (h - 40) * 0.32} stroke="rgba(255,255,255,0.5)" strokeDasharray="5 4" />
      <text x={w / 2} y={34} textAnchor="middle" fontSize={9} fill="var(--text-dim)">NET / KITCHEN</text>
      <text x={w / 2} y={h - 8} textAnchor="middle" fontSize={9} fill="var(--text-dim)">BASELINE</text>
      {/* serve depth band */}
      <line x1={20} y1={yFor(serveDepth)} x2={w - 20} y2={yFor(serveDepth)} stroke="var(--primary)" strokeWidth={2.5} />
      <circle cx={w / 2 - 26} cy={yFor(serveDepth)} r={5} fill="var(--primary)" />
      <text x={26} y={yFor(serveDepth) - 6} fontSize={10} fontWeight={700} fill="var(--primary)">Serve {serveDepth}ft</text>
      {/* return depth band */}
      <line x1={20} y1={yFor(returnDepth)} x2={w - 20} y2={yFor(returnDepth)} stroke="var(--indigo)" strokeWidth={2.5} strokeDasharray="6 3" />
      <circle cx={w / 2 + 26} cy={yFor(returnDepth)} r={5} fill="var(--indigo)" />
      <text x={w - 26} y={yFor(returnDepth) + 14} textAnchor="end" fontSize={10} fontWeight={700} fill="var(--indigo)">Return {returnDepth}ft</text>
    </svg>
  );
}

/* ---------------- Horizontal bars ---------------- */
export function HBars({
  data,
  max,
  unit = "",
}: {
  data: { label: string; value: number; color?: string }[];
  max?: number;
  unit?: string;
}) {
  const m = max ?? Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13.5 }}>
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span className="muted" style={{ fontWeight: 700 }}>
              {d.value}
              {unit}
            </span>
          </div>
          <div className="progress">
            <div
              className="progress-bar"
              style={{
                width: `${(d.value / m) * 100}%`,
                background: d.color || "linear-gradient(90deg, var(--primary-dim), var(--primary))",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Rating-over-time line chart for the career trend (y fixed to the DUPR 2-8 band).
export function RatingTrend({ points }: { points: { label: string; value: number }[] }) {
  const W = 640;
  const H = 150;
  const padL = 26;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const lo = 2;
  const hi = 8;
  const n = points.length;
  const x = (i: number) =>
    padL + (n <= 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) =>
    padT + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - padT - padB);
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%" }}>
      {[2, 4, 6, 8].map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <text x={padL - 5} y={y(g) + 3} textAnchor="end" fontSize={9} fill="var(--text-dim)">{g}</text>
        </g>
      ))}
      {n > 1 && (
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--primary)" stroke="#0a0e1a" strokeWidth={1} />
      ))}
    </svg>
  );
}
