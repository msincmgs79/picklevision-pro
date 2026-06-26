"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { getPlanState, consumeVideo, MAX_VIDEO_BYTES, PLAN_LABEL, type PlanState } from "../../../lib/plan";
import { uploadVideo } from "../../../lib/upload";

type Stage = "form" | "uploading" | "saving" | "done" | "error";

export default function NewMatchPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState("My Team");
  const [opponent, setOpponent] = useState("Opponent");
  const [score, setScore] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthed(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(Boolean(data.user)));
    getPlanState(supabase).then(setPlanState);
  }, []);

  function onPickFile(f: File | null) {
    if (f && f.size > MAX_VIDEO_BYTES) {
      setError("Videos are capped at 1 GB. Please trim or compress the clip and try again.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
    setDuration(null);
    if (f) {
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
      const url = URL.createObjectURL(f);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        setDuration(Math.round(v.duration));
        URL.revokeObjectURL(url);
      };
      v.src = url;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired — please sign in again.");
      setStage("error");
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setError("Videos are capped at 1 GB. Please trim or compress the clip and try again.");
      setStage("error");
      return;
    }

    const allowance = await getPlanState(supabase);
    if (allowance.remaining <= 0) {
      router.push("/upgrade");
      return;
    }

    try {
      setStage("saving");
      // 1) create the match row to get an id
      const { data: inserted, error: insErr } = await supabase
        .from("matches")
        .insert({
          title: title || "Untitled match",
          team,
          opponent,
          score: score || null,
          recorded_at: recordedAt || null,
          duration_seconds: duration,
          status: "uploaded",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // 2) upload the video (resumable / chunked) under <user_id>/<match_id>.<ext>
      setStage("uploading");
      setUploadPct(0);
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${user.id}/${inserted.id}.${ext}`;
      try {
        await uploadVideo(supabase, file, path, setUploadPct);
      } catch (upErr) {
        await supabase.from("matches").delete().eq("id", inserted.id);
        throw upErr;
      }

      // 3) attach the path to the match
      setStage("saving");
      const { error: updErr } = await supabase
        .from("matches")
        .update({ video_path: path })
        .eq("id", inserted.id);
      if (updErr) throw updErr;

      // Optional W/L — separate update so a missing `result` column can't fail the upload.
      if (result) await supabase.from("matches").update({ result }).eq("id", inserted.id);

      await consumeVideo(supabase);
      setStage("done");
      router.push(`/matches/${inserted.id}`);
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
      setStage("error");
    }
  }

  if (authed === false && !isSupabaseConfigured) {
    return (
      <Wrap>
        <div className="card" style={{ borderColor: "var(--average)", background: "rgba(251,191,36,0.07)" }}>
          <div style={{ fontWeight: 700, color: "var(--average)" }}>Backend not connected</div>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
            Uploads turn on once Supabase keys are added. Explore the{" "}
            <Link href="/analysis" style={{ color: "var(--primary)" }}>demo match</Link> meanwhile.
          </p>
        </div>
      </Wrap>
    );
  }
  if (authed === false) {
    return (
      <Wrap>
        <div className="card">
          <div className="section-title">Please sign in</div>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>You need an account to upload matches.</p>
          <Link href="/login" className="btn btn-primary" style={{ marginTop: 14 }}>Sign in →</Link>
        </div>
      </Wrap>
    );
  }

  const busy = stage === "uploading" || stage === "saving" || stage === "done";

  return (
    <Wrap>
      <form onSubmit={submit} className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", alignItems: "start" }}>
        {/* dropzone */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Video file</div>
          <label
            style={{
              display: "block",
              border: "2px dashed var(--border-light)",
              borderRadius: 12,
              padding: file ? 14 : 36,
              textAlign: "center",
              cursor: "pointer",
              background: "var(--bg-2)",
            }}
          >
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              disabled={busy}
            />
            {file ? (
              <video ref={previewRef} src={URL.createObjectURL(file)} controls style={{ width: "100%", borderRadius: 8 }} />
            ) : (
              <>
                <div style={{ fontSize: 40 }}>⤴</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>Choose a video to upload</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  MP4, MOV or WebM · up to 1 GB.
                </div>
              </>
            )}
          </label>
          {file && (
            <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              {duration ? ` · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : ""}
            </div>
          )}
        </div>

        {/* details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Match title"><input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tuesday league night" /></Field>
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Your team"><input style={inp} value={team} onChange={(e) => setTeam(e.target.value)} /></Field>
              <Field label="Opponent"><input style={inp} value={opponent} onChange={(e) => setOpponent(e.target.value)} /></Field>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Score (optional)"><input style={inp} value={score} onChange={(e) => setScore(e.target.value)} placeholder="11–7, 11–9" /></Field>
              <Field label="Date"><input type="date" style={inp} value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} /></Field>
            </div>
            <Field label="Result (optional)">
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "win", label: "Win" }, { v: "loss", label: "Loss" }, { v: null, label: "—" }].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setResult(o.v)}
                    className={"btn btn-sm " + (result === o.v ? "btn-primary" : "btn-ghost")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {error && (
            <div className="card" style={{ borderColor: "var(--poor)", background: "rgba(248,113,113,0.08)" }}>
              <div style={{ color: "var(--poor)", fontWeight: 700, fontSize: 14 }}>Upload error</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{error}</div>
            </div>
          )}

          {planState && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              {planState.remaining > 0 ? (
                <>{planState.remaining} video{planState.remaining === 1 ? "" : "s"} left this month{planState.credits > 0 ? ` · ${planState.credits} credits` : ""} · {PLAN_LABEL[planState.plan]} plan</>
              ) : (
                <>You&apos;re out of videos this month — <Link href="/upgrade" style={{ color: "var(--primary)" }}>upgrade or buy credits</Link>.</>
              )}
            </div>
          )}
          {stage === "uploading" && (
            <div className="progress" style={{ height: 8 }}>
              <div className="progress-bar" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          <button className="btn btn-primary" disabled={!file || busy} style={{ justifyContent: "center", opacity: !file || busy ? 0.6 : 1 }}>
            {stage === "uploading" ? `Uploading… ${uploadPct}%` : stage === "saving" ? "Saving…" : stage === "done" ? "Done ✓" : "⤴ Upload match"}
          </button>
          <p className="dim" style={{ fontSize: 12 }}>
            Your video is stored privately — only you can view it. AI analysis is a later step; for now you can watch, draw and bookmark.
          </p>
        </div>
      </form>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow">Upload</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Add a match</h1>
      <p className="page-sub">Upload pre-recorded footage to your private library.</p>
      <div style={{ marginTop: 22 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", flex: 1 }}>
      {label}
      <div style={{ marginTop: 5 }}>{children}</div>
    </label>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid var(--border-light)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
};
