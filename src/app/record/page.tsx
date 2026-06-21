"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Phase = "idle" | "ready" | "recording" | "review" | "processing" | "done";

const pipeline = [
  { key: "upload", label: "Background upload", detail: "Streaming clip to PickleVision Cloud" },
  { key: "court", label: "Court recognition", detail: "Detecting lines & isolating pickleball court" },
  { key: "track", label: "Ball & player tracking", detail: "Locating ball, players and contact points" },
  { key: "shots", label: "Shot classification", detail: "Labeling serve, drop, dink, drive, Erne…" },
  { key: "trim", label: "Dead-time removal", detail: "Cutting timeouts & ball retrieval between rallies" },
];

export default function RecordPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait" | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState(0);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function enableCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const w = settings.width || 16;
      const h = settings.height || 9;
      setOrientation(w >= h ? "landscape" : "portrait");
      setPhase("ready");
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser to record, or continue with the demo."
          : "No camera available on this device. You can still explore the app with the demo match."
      );
    }
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const rec = new MediaRecorder(streamRef.current);
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setClipUrl(URL.createObjectURL(blob));
        setPhase("review");
      };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Recording is not supported in this browser.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function startProcessing() {
    setPhase("processing");
    setStepProgress(0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    let p = 0;
    const iv = setInterval(() => {
      p += 1;
      setStepProgress(p);
      if (p >= pipeline.length) {
        clearInterval(iv);
        setTimeout(() => setPhase("done"), 700);
      }
    }, 1100);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      <div className="eyebrow">Step 1 · Capture</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Record &amp; Upload</h1>
      <p className="page-sub">
        Record straight from your phone. PickleVision validates framing, then processes everything in the background.
      </p>

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", marginTop: 24, alignItems: "start" }}>
        {/* viewfinder */}
        <div className="card" style={{ padding: 14 }}>
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              background: "#05080f",
              aspectRatio: "16 / 9",
              display: "grid",
              placeItems: "center",
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: phase === "idle" || phase === "processing" || phase === "done" ? "none" : "block",
              }}
            />

            {/* court recognition overlay */}
            {(phase === "ready" || phase === "recording") && <CourtOverlay live={phase === "recording"} />}

            {phase === "recording" && (
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.55)", padding: "6px 12px", borderRadius: 999 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--poor)", animation: "pulse 1s infinite" }} />
                <b style={{ fontSize: 13 }}>REC {fmt(seconds)}</b>
              </div>
            )}

            {phase === "idle" && (
              <div style={{ textAlign: "center", padding: 30 }}>
                <div style={{ fontSize: 46, marginBottom: 10 }}>📹</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Camera off</div>
                <div className="muted" style={{ fontSize: 13.5, marginTop: 4, maxWidth: 320 }}>
                  Enable your camera to record a live game, or jump straight to the analyzed demo match.
                </div>
              </div>
            )}

            {(phase === "processing" || phase === "done") && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 46 }}>{phase === "done" ? "✅" : "⚙️"}</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>
                  {phase === "done" ? "Analysis complete" : "Processing in the background…"}
                </div>
              </div>
            )}
          </div>

          {/* controls */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {phase === "idle" && (
              <button className="btn btn-primary" onClick={enableCamera}>● Enable Camera</button>
            )}
            {phase === "ready" && (
              <button className="btn btn-primary" onClick={startRecording}>● Start Recording</button>
            )}
            {phase === "recording" && (
              <button className="btn" style={{ background: "var(--poor)", borderColor: "var(--poor)", color: "#fff" }} onClick={stopRecording}>
                ■ Stop
              </button>
            )}
            {phase === "review" && (
              <>
                <button className="btn btn-primary" onClick={startProcessing}>⤴ Upload &amp; Analyze</button>
                <button className="btn btn-ghost" onClick={() => setPhase("ready")}>↺ Re-record</button>
              </>
            )}
            {phase === "done" && (
              <Link className="btn btn-primary" href="/analysis">View Shot Analysis →</Link>
            )}
            <Link className="btn btn-ghost" href="/analysis">Skip — open demo match</Link>
          </div>

          {clipUrl && phase === "review" && (
            <video src={clipUrl} controls style={{ width: "100%", marginTop: 12, borderRadius: 10 }} />
          )}
        </div>

        {/* side panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div className="card" style={{ borderColor: "rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.08)" }}>
              <div style={{ fontWeight: 700, color: "var(--poor)", fontSize: 14 }}>Heads up</div>
              <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{error}</div>
            </div>
          )}

          <div className="card">
            <div className="section-title" style={{ marginBottom: 12 }}>Capture checks</div>
            <Check ok={phase !== "idle"} label="Camera connected" />
            <Check
              ok={orientation !== null}
              label={`Orientation ${orientation ? `· ${orientation} ✓` : "validation"}`}
              detail={orientation === "portrait" ? "Portrait works — landscape recommended for doubles" : undefined}
            />
            <Check ok={phase === "ready" || phase === "recording" || phase === "review"} label="Court lines detected" detail="Handles multi-line tennis/pickleball courts" />
            <Check ok={phase === "recording" || phase === "review"} label="Recording active" />
          </div>

          {(phase === "processing" || phase === "done") && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Processing pipeline</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pipeline.map((step, i) => {
                  const state = stepProgress > i ? "done" : stepProgress === i && phase === "processing" ? "active" : "wait";
                  return (
                    <div key={step.key} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          flexShrink: 0,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          background: state === "done" ? "var(--primary)" : state === "active" ? "var(--indigo-dim)" : "var(--surface-2)",
                          color: state === "done" ? "#0a1300" : "#fff",
                        }}
                      >
                        {state === "done" ? "✓" : state === "active" ? "•" : i + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: state === "wait" ? "var(--text-dim)" : "var(--text)" }}>
                          {step.label}
                        </div>
                        <div className="dim" style={{ fontSize: 12 }}>{step.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="dim" style={{ fontSize: 12, marginTop: 14 }}>
                ⓘ You can close the app — processing continues in the background and you&apos;ll be notified when it&apos;s ready.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}`}</style>
    </div>
  );
}

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0" }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          background: ok ? "rgba(52,211,153,0.18)" : "var(--surface-2)",
          color: ok ? "var(--excellent)" : "var(--text-dim)",
          border: ok ? "1px solid rgba(52,211,153,0.4)" : "1px solid var(--border)",
        }}
      >
        {ok ? "✓" : "○"}
      </span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
        {detail && <div className="dim" style={{ fontSize: 12 }}>{detail}</div>}
      </div>
    </div>
  );
}

function CourtOverlay({ live }: { live: boolean }) {
  return (
    <svg
      viewBox="0 0 400 225"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <polygon
        points="120,70 280,70 360,205 40,205"
        fill="rgba(163,230,53,0.06)"
        stroke="var(--primary)"
        strokeWidth={1.5}
        strokeDasharray={live ? "0" : "6 4"}
      />
      <line x1="95" y1="115" x2="305" y2="115" stroke="var(--primary)" strokeWidth={1} opacity={0.7} />
      <line x1="200" y1="70" x2="200" y2="205" stroke="var(--primary)" strokeWidth={0.8} opacity={0.5} />
      <text x="200" y="62" textAnchor="middle" fontSize="9" fill="var(--primary)" fontWeight="700">
        {live ? "● TRACKING COURT" : "COURT DETECTED"}
      </text>
    </svg>
  );
}
