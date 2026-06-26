import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { useR2 } from "../../../lib/storage/server";

// R2 presign / delete proxy for the browser. The R2 secrets stay on the server;
// the client posts here to get a short-lived presigned URL (get/put) or to
// delete an object. Ownership is enforced by the object-key prefix (user id),
// mirroring the Supabase Storage RLS policy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 503 });
  }
  if (!useR2) {
    return NextResponse.json({ error: "R2 storage is not enabled." }, { status: 400 });
  }

  const {
    r2Configured,
    r2PresignGet,
    r2PresignPut,
    r2Delete,
    r2CreateMultipart,
    r2PresignUploadPart,
    r2CompleteMultipart,
    r2AbortMultipart,
  } = await import("../../../lib/storage/r2");
  if (!r2Configured) {
    return NextResponse.json({ error: "R2 storage is not configured." }, { status: 503 });
  }

  let body: {
    op?: string;
    path?: string;
    contentType?: string;
    uploadId?: string;
    partNumber?: number;
    parts?: { PartNumber: number; ETag: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { op, path, contentType, uploadId, partNumber, parts } = body;
  if (!op || !path) return NextResponse.json({ error: "op and path are required." }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // A user may only touch objects under their own id prefix.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    if (op === "get") {
      return NextResponse.json({ url: await r2PresignGet(path, 3600) });
    }
    if (op === "put") {
      return NextResponse.json({
        url: await r2PresignPut(path, contentType || "video/mp4", 3600),
      });
    }
    if (op === "delete") {
      await r2Delete(path);
      return NextResponse.json({ ok: true });
    }
    if (op === "create-multipart") {
      return NextResponse.json({ uploadId: await r2CreateMultipart(path, contentType || "video/mp4") });
    }
    if (op === "sign-part") {
      if (!uploadId || !partNumber)
        return NextResponse.json({ error: "uploadId and partNumber are required." }, { status: 400 });
      return NextResponse.json({ url: await r2PresignUploadPart(path, uploadId, partNumber) });
    }
    if (op === "complete-multipart") {
      if (!uploadId || !parts?.length)
        return NextResponse.json({ error: "uploadId and parts are required." }, { status: 400 });
      await r2CompleteMultipart(path, uploadId, parts);
      return NextResponse.json({ ok: true });
    }
    if (op === "abort-multipart") {
      if (!uploadId) return NextResponse.json({ error: "uploadId is required." }, { status: 400 });
      await r2AbortMultipart(path, uploadId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown op." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Storage operation failed." }, { status: 502 });
  }
}
