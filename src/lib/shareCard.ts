// Generates a branded, social-ready PNG "results card" entirely client-side
// (canvas) — no server, no public data exposure. Shows the player's career
// rating alongside the specific match's rating.

export interface ShareCardData {
  title: string;
  teams: string;
  careerRating?: number | null;
  matchRating: number;
  topSkill?: { label: string; value: number } | null;
  coachTip?: string | null;
  date?: string | null;
}

const LIME = "#a3e635";
const WHITE = "#f8fafc";
const MUTED = "#94a3b8";

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    // ellipsize the last line if there was overflow
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxW && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}

export async function buildShareCard(d: ShareCardData): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  // background
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, "#0a0e1a");
  g.addColorStop(1, "#0f1733");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const rg = ctx.createRadialGradient(S * 0.85, S * 0.12, 0, S * 0.85, S * 0.12, S * 0.55);
  rg.addColorStop(0, "rgba(163,230,53,0.12)");
  rg.addColorStop(1, "rgba(163,230,53,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, S, S);

  const pad = 96;
  ctx.textBaseline = "alphabetic";

  // brand row
  let brandX = pad;
  const brandY = pad + 40;
  try {
    const logo = await loadImg("/logo.png");
    const lh = 96;
    const lw = logo.width ? lh * (logo.width / logo.height) : lh;
    ctx.drawImage(logo, pad, brandY - lh + 18, lw, lh);
    brandX = pad + lw + 26;
  } catch {
    /* logo optional */
  }
  ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillStyle = WHITE;
  ctx.fillText("Pickle", brandX, brandY);
  const pw = ctx.measureText("Pickle").width;
  ctx.fillStyle = LIME;
  ctx.fillText("Vision", brandX + pw, brandY);

  // match title + teams
  ctx.fillStyle = WHITE;
  ctx.font = "800 76px system-ui, sans-serif";
  const titleLines = wrap(ctx, d.title || "Match", S - pad * 2, 2);
  let ty = pad + 230;
  for (const l of titleLines) {
    ctx.fillText(l, pad, ty);
    ty += 88;
  }
  ctx.fillStyle = MUTED;
  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillText(d.teams || "", pad, ty + 6);

  // two rating blocks
  const blockY = ty + 70;
  const blockH = 280;
  const gap = 36;
  const hasCareer = d.careerRating != null && isFinite(d.careerRating as number);
  const blockW = hasCareer ? (S - pad * 2 - gap) / 2 : S - pad * 2;

  function ratingBlock(ctx: CanvasRenderingContext2D, x: number, w: number, label: string, value: number) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, x, blockY, w, blockH, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(163,230,53,0.25)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, blockY, w, blockH, 28);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = MUTED;
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), x + w / 2, blockY + 64);
    ctx.fillStyle = LIME;
    ctx.font = "800 150px system-ui, sans-serif";
    ctx.fillText(value.toFixed(1), x + w / 2, blockY + 196);
    ctx.fillStyle = MUTED;
    ctx.font = "500 26px system-ui, sans-serif";
    ctx.fillText("AI DUPR estimate", x + w / 2, blockY + 240);
    ctx.textAlign = "left";
  }

  if (hasCareer) {
    ratingBlock(ctx, pad, blockW, "Career", d.careerRating as number);
    ratingBlock(ctx, pad + blockW + gap, blockW, "This match", d.matchRating);
  } else {
    ratingBlock(ctx, pad, blockW, "AI rating", d.matchRating);
  }

  // coach tip / top skill strip
  let fy = blockY + blockH + 80;
  if (d.topSkill) {
    ctx.fillStyle = WHITE;
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText(`Top skill · ${d.topSkill.label} ${d.topSkill.value.toFixed(1)}`, pad, fy);
    fy += 56;
  }
  if (d.coachTip) {
    ctx.fillStyle = MUTED;
    ctx.font = "400 32px system-ui, sans-serif";
    for (const l of wrap(ctx, `“${d.coachTip}”`, S - pad * 2, 2)) {
      ctx.fillText(l, pad, fy);
      fy += 44;
    }
  }

  // footer
  ctx.fillStyle = MUTED;
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText("AI analysis · picklevision", pad, S - pad + 10);
  if (d.date) {
    ctx.textAlign = "right";
    ctx.fillText(String(d.date).slice(0, 10), S - pad, S - pad + 10);
    ctx.textAlign = "left";
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render image"))), "image/png")
  );
}
