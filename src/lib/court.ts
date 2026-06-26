// Shared court geometry helpers for the ball maps.
// A flat court calibration (homography) only locates the ball correctly when it
// is ON the court surface. Airborne balls and false detections project far
// outside the lines, so anything well off-court (or low-confidence) is treated as
// noise — kept out of the scatter/landing maps and the in/out counts.

// Distance (ft) a court point lies outside the 20ft x 44ft court; 0 if inside.
export function courtDistOutside(courtX: number, courtY: number): number {
  const dx = Math.max(0, 0 - courtX, courtX - 20);
  const dy = Math.max(0, 0 - courtY, courtY - 44);
  return Math.hypot(dx, dy);
}

// A detection is a plausible on/near-court ball if it's confident enough and not
// flung far off-court by airborne parallax / a false positive.
export function isPlausibleBall(
  d: { courtX: number; courtY: number; confidence?: number },
  maxOutside = 8,
  minConf = 0.2
): boolean {
  return (d.confidence ?? 1) >= minConf && courtDistOutside(d.courtX, d.courtY) <= maxOutside;
}
