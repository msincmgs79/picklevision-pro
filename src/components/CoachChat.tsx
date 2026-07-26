"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What should I work on first?",
  "Give me a drill for my weakest skill",
  "How's my kitchen play?",
  "What am I doing well?",
];

// In-app AI coach: streams a reply from /api/coach, grounded in this match's
// analysis. Self-contained so the match page only needs to mount it.
export default function CoachChat({
  matchId,
  hasAnalysis,
  alreadyUsed,
  onUsed,
}: {
  matchId: string;
  hasAnalysis: boolean;
  alreadyUsed?: boolean;
  onUsed?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usedRef = useRef(!!alreadyUsed);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    setInput("");

    const history = [...messages, { role: "user" as const, content: q }];
    setMessages(history);
    setBusy(true);
    scrollToBottom();

    // Record the first use (included per match) — fire and forget.
    if (!usedRef.current) {
      usedRef.current = true;
      try {
        onUsed?.();
      } catch {
        /* non-fatal */
      }
    }

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, messages: history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error || "The coach is unavailable right now.");
      }

      // Stream the reply into a new assistant bubble.
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = m.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { role: "assistant", content: last.content + chunk };
          return copy;
        });
        scrollToBottom();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      // Drop a trailing empty assistant bubble if the request failed before any text.
      setMessages((m) => (m.length && m[m.length - 1].role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m));
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }

  if (!hasAnalysis) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <strong style={{ fontSize: 15 }}>🎓 AI Coach</strong>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
          Run the <b>AI shot breakdown</b> for this match first — the coach reads that analysis to answer your questions.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <strong style={{ fontSize: 15 }}>🎓 AI Coach</strong>
        <span className="muted" style={{ fontSize: 12.5, marginLeft: 8 }}>
          Answers from this match&rsquo;s analysis · AI estimate, not official DUPR
        </span>
      </div>

      <div ref={scrollRef} style={{ maxHeight: 420, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 ? (
          <div>
            <p className="muted" style={{ fontSize: 13.5, margin: "0 0 12px", lineHeight: 1.5 }}>
              Ask about your game in this match — strengths, what to work on, or a drill. Try:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STARTERS.map((s) => (
                <button key={s} className="btn btn-sm btn-ghost" onClick={() => send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                background: m.role === "user" ? "rgba(163,230,53,0.14)" : "var(--surface-2, rgba(255,255,255,0.04))",
                border: "1px solid " + (m.role === "user" ? "rgba(163,230,53,0.3)" : "var(--border)"),
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {m.content || (busy ? "…" : "")}
            </div>
          ))
        )}
      </div>

      {error && (
        <div style={{ padding: "0 18px 8px", fontSize: 12.5, color: "var(--poor)" }}>{error}</div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid var(--border)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach…"
          disabled={busy}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: 14,
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !input.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
