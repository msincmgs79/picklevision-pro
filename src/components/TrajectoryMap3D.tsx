import type { Trajectory, TrajPoint } from "../lib/analysis";

type View = "3d" | "top" | "side";

const W = 460;
const H = 320;

function colorFor(io?: string | null) {
  // green = in, red = out, neutral grey = in/out unknown (court not calibrated)
  return io === "in" ? "var(--excellent)" : io === "out" ? "var(--poor)" : "#94a3b8";
}

// How far (ft) a point lies outside the 20x44 court; 0 if inside. The smallest
// value in a rally is its most-grounded point — the meaningful in/out landing.
function distOutside(p: TrajPoint): number {
  const dx = Math.max(0, 0 - p.courtX, p.courtX - 20);
  const dy = Math.max(0, 0 - p.courtY, p.courtY - 44);
  return Math.hypot(dx, dy);
}

// Synthesized arc height (we don't measure true Z) — parabola scaled by shot length.
function heights(pts: TrajPoint[]): number[] {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].courtX - pts[i - 1].courtX;
    const dy = pts[i].courtY - pts[i - 1].courtY;
    L += Math.hypot(dx, dy);
  }
  const peak = Math.min(8, Math.max(1.5, L * 0.22));
  return pts.map((_, i) => {
    const f = pts.length > 1 ? i / (pts.length - 1) : 0;
    return peak * 4 * f * (1 - f);
  });
}

// project court (cx 0..20, cy 0..44) + height(ft) -> screen [x,y] per view
function projector(view: View) {
  if (view === "top") {
    const m = 20;
    const cw = W - m * 2;
    const ch = H - m * 2;
    return (cx: number, cy: number) => [m + (cx / 20) * cw, m + (cy / 44) * ch];
  }
  if (view === "side") {
    const m = 24;
    const baseY = H - 40;
    const cw = W - m * 2;
    const hScale = (baseY - 24) / 12; // 12ft tall view
    return (cy: number, hgt: number) => [m + (cy / 44) * cw, baseY - hgt * hScale];
  }
  // 3d perspective trapezoid
  const topY = 26;
  const botY = H - 22;
  const hScale = 9;
  return (cx: number, cy: number, hgt: number) => {
    const t = cy / 44;
    const yy = topY + (botY - topY) * t;
    const half = (0.3 + 0.16 * t) * (W / 2);
    const xx = W / 2 + (cx / 20 - 0.5) * 2 * half;
    return [xx, yy - hgt * hScale];
  };
}

export default function TrajectoryMap3D({
  trajectories,
  view,
}: {
  trajectories: Trajectory[];
  view: View;
}) {
  const proj = projector(view);

  // court outline per view
  let court: React.ReactNode;
  if (view === "top") {
    const p = proj as (cx: number, cy: number) => number[];
    const [, netY] = p(0, 22);
    const [, k1] = p(0, 15);
    const [, k2] = p(0, 29);
    const [lx] = p(0, 0);
    const [rx] = p(20, 0);
    court = (
      <>
        <rect x={lx} y={p(0, 0)[1]} width={rx - lx} height={p(0, 44)[1] - p(0, 0)[1]} fill="#16243f" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
        <line x1={lx} y1={netY} x2={rx} y2={netY} stroke="#fff" strokeWidth={2} />
        <line x1={lx} y1={k1} x2={rx} y2={k1} stroke="rgba(255,255,255,0.4)" strokeDasharray="5 4" />
        <line x1={lx} y1={k2} x2={rx} y2={k2} stroke="rgba(255,255,255,0.4)" strokeDasharray="5 4" />
      </>
    );
  } else if (view === "side") {
    const p = proj as (cy: number, h: number) => number[];
    const baseY = p(0, 0)[1];
    const [netX] = p(22, 0);
    court = (
      <>
        <line x1={p(0, 0)[0]} y1={baseY} x2={p(44, 0)[0]} y2={baseY} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
        <line x1={netX} y1={baseY} x2={netX} y2={baseY - 34} stroke="#fff" strokeWidth={2} />
        <text x={netX} y={baseY + 16} textAnchor="middle" fontSize={9} fill="var(--text-dim)">net</text>
      </>
    );
  } else {
    const p = proj as (cx: number, cy: number, h: number) => number[];
    const floor = [p(0, 0, 0), p(20, 0, 0), p(20, 44, 0), p(0, 44, 0)].map((q) => q.join(",")).join(" ");
    const [nlx, nly] = p(0, 22, 0);
    const [nrx] = p(20, 22, 0);
    court = (
      <>
        <polygon points={floor} fill="#16243f" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
        <line x1={nlx} y1={nly} x2={nrx} y2={nly} stroke="#fff" strokeWidth={1.5} />
        {[15, 29].map((ky, i) => {
          const [lx, ly] = p(0, ky, 0);
          const [rx] = p(20, ky, 0);
          return <line key={i} x1={lx} y1={ly} x2={rx} y2={ly} stroke="rgba(255,255,255,0.35)" strokeDasharray="5 4" />;
        })}
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, background: "transparent" }}>
      {court}
      {trajectories.map((tr, ti) => {
        if (!tr.points.length) return null;
        const col = colorFor(tr.inOut);
        // Faint flight backdrop: clip the wilder airborne points so the path
        // doesn't sprawl across the whole frame.
        const near = tr.points.filter((p) => distOutside(p) <= 8);
        const hs = heights(near);
        const pathPts = near.map((pt, i) => {
          if (view === "top") return (proj as any)(pt.courtX, pt.courtY);
          if (view === "side") return (proj as any)(pt.courtY, hs[i]);
          return (proj as any)(pt.courtX, pt.courtY, hs[i]);
        });
        const d = pathPts.map((q, i) => `${i === 0 ? "M" : "L"} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
        // Landing = the most-grounded point (least outside the court). Drawn on
        // the floor (height 0) as the prominent, readable in/out marker.
        let landing = tr.points[0];
        for (const p of tr.points) if (distOutside(p) < distOutside(landing)) landing = p;
        const lp =
          view === "top"
            ? (proj as any)(landing.courtX, landing.courtY)
            : view === "side"
            ? (proj as any)(landing.courtY, 0)
            : (proj as any)(landing.courtX, landing.courtY, 0);
        return (
          <g key={ti}>
            {pathPts.length > 1 && (
              <path d={d} fill="none" stroke={col} strokeWidth={1} opacity={0.16} strokeLinecap="round" strokeLinejoin="round" />
            )}
            <circle cx={lp[0]} cy={lp[1]} r={3.4} fill={col} opacity={0.95} stroke="#0a0e1a" strokeWidth={0.8} />
          </g>
        );
      })}
      {trajectories.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fill="var(--text-dim)">No trajectories in this segment</text>
      )}
    </svg>
  );
}
