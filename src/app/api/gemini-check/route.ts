import { NextResponse } from "next/server";

// Temporary diagnostic: verifies GEMINI_API_KEY works and lists the models it
// can use for generateContent. The key stays server-side (never returned).
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY not set" }, { status: 503 });
  }
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key },
      cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, status: r.status, error: data?.error?.message || "request failed" },
        { status: 200 }
      );
    }
    const models = (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => m.name);
    return NextResponse.json({ ok: true, count: models.length, models });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "fetch failed" }, { status: 200 });
  }
}
