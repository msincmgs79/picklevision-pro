// Server-only Cloudflare R2 helpers (S3-compatible API).
// R2 is reached through the AWS S3 SDK pointed at the account endpoint.
// Secrets live only here (server) — never shipped to the browser.
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const BUCKET = process.env.R2_BUCKET || "";

// True only when every R2 secret is present. Routes check this and 503 cleanly
// if R2 is selected but not yet configured.
export const r2Configured = Boolean(
  ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET
);

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    forcePathStyle: true,
    // AWS SDK v3 (>=3.729) injects flexible-checksum headers into presigned
    // PUTs by default. R2 rejects those on browser uploads and the error
    // response has no CORS headers, so the browser reports a bare "network
    // error". WHEN_REQUIRED stops the SDK adding them — restoring browser PUTs.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return _client;
}

// Short-lived URL the browser (or Railway) can GET the private video from.
export function r2PresignGet(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

// Short-lived URL the browser can PUT the video to. The client must send the
// same Content-Type that was signed here.
export function r2PresignPut(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function r2Delete(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
