"use client";

import { useState } from "react";
import { buildShareCard, type ShareCardData } from "../lib/shareCard";

// Generates the results card and shares it via the native share sheet (mobile)
// or downloads it (desktop / unsupported).
export default function ShareButton({ data, className }: { data: ShareCardData; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onShare() {
    setBusy(true);
    setDone(null);
    try {
      const blob = await buildShareCard(data);
      const file = new File([blob], "picklevision-rating.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "My PickleVision rating",
          text: `${data.teams} — AI rating ${data.matchRating.toFixed(1)} (DUPR scale)`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "picklevision-rating.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setDone("Saved ✓");
        setTimeout(() => setDone(null), 2500);
      }
    } catch (e) {
      // user cancelling the native share throws AbortError — not an error
      if ((e as Error)?.name !== "AbortError") {
        setDone("Couldn’t create card");
        setTimeout(() => setDone(null), 2500);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={className || "btn btn-sm"} onClick={onShare} disabled={busy}>
      {busy ? "Creating…" : done || "⤴ Share card"}
    </button>
  );
}
