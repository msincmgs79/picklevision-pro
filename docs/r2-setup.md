# Cloudflare R2 — go-live setup (click by click)

The app now stores match videos in **Cloudflare R2** instead of Supabase Storage
whenever the env var `NEXT_PUBLIC_STORAGE_BACKEND=r2` is set. Until that var is
set, everything keeps using Supabase exactly as before — so nothing breaks while
you do these steps.

R2 removes the 50 MB upload cap and has **zero egress fees** (no charge when
videos are watched/downloaded), which is why we use it for full-match footage.

You do steps 1–4 in the Cloudflare + Vercel dashboards (they involve creating
credentials, which I can't do for you). I've already written all the code.

---

## 1. Create the bucket

1. Go to **Cloudflare dashboard → R2** (left sidebar).
2. Click **Create bucket**.
3. Name it: **`picklevision-videos`** (lowercase, no spaces).
4. Location: **Automatic**. Click **Create bucket**.
5. Leave it **private** — do NOT enable public access. The app serves videos
   through short-lived signed links instead, so they stay private to each user.

## 2. Add the CORS policy (lets the browser upload + play)

1. Open the bucket → **Settings** tab → scroll to **CORS Policy** → **Edit**.
2. Paste this, then **Save**:

```json
[
  {
    "AllowedOrigins": [
      "https://picklevision-clean.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> If your live site uses a different/custom domain later, add it to
> `AllowedOrigins` too (keep `localhost:3000` for local testing).

## 3. Create an R2 API token (the S3 keys)

1. On the **R2 overview** page click **Manage R2 API Tokens** (top right) →
   **Create API token**.
2. Token name: `picklevision-app`.
3. Permissions: **Object Read & Write**.
4. Specify bucket(s): **Apply to specific buckets only → `picklevision-videos`**.
5. TTL: leave as default (no expiry is fine for a server key).
6. Click **Create API Token**. Cloudflare shows, **once**:
   - **Access Key ID**
   - **Secret Access Key**

   Copy both now — the secret is shown only this one time.

## 4. Add the env vars in Vercel

Vercel → your **picklevision** project → **Settings → Environment Variables**.
Add these for the **Production** environment (and Preview, if you test there):

| Name | Value |
|------|-------|
| `R2_ACCOUNT_ID` | `b84db47271d1a640c0c735b819f49bd8` |
| `R2_ACCESS_KEY_ID` | *(the Access Key ID from step 3)* |
| `R2_SECRET_ACCESS_KEY` | *(the Secret Access Key from step 3)* |
| `R2_BUCKET` | `picklevision-videos` |
| `NEXT_PUBLIC_STORAGE_BACKEND` | `r2` |

> `R2_ACCOUNT_ID` is pre-filled from your dashboard URL. To double-check it,
> open the bucket → **Settings → S3 API** — the endpoint reads
> `https://<this-id>.r2.cloudflarestorage.com`.

## 5. Redeploy

`NEXT_PUBLIC_STORAGE_BACKEND` is baked in at build time, so after saving the
vars you must redeploy: Vercel → **Deployments → ⋯ on the latest → Redeploy**
(or just push any commit). Once the new deploy is live, uploads go to R2.

---

## After cutover

- **Test it:** upload a new match. In Cloudflare → bucket → **Objects** you
  should see `…/<your-user-id>/<match-id>.mp4`. Play it back, then run tracking.
- **Old test videos:** matches uploaded *before* the switch still live in
  Supabase and will **not** play under R2 (the app looks for them in R2 now).
  Re-upload or delete those few test matches. (Going forward everything is R2.)
- **To roll back:** remove `NEXT_PUBLIC_STORAGE_BACKEND` (or set it to
  `supabase`) and redeploy — instantly back on Supabase.

## Known limitation (fine for now)

R2 uploads use a single presigned PUT (supports files up to 5 GB), so a dropped
connection restarts the upload rather than resuming mid-file. The resumable
(chunked) path still exists for Supabase. If resumable R2 uploads become
important, the upgrade is S3 multipart — a follow-up, not needed to go live.
