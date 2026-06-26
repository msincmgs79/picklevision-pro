# Self-hosting the detection model — implementation plan

**Status:** planned, not built. Pull the trigger when volume justifies it (see "When").
**Goal:** stop paying Roboflow's per-inference hosted fee by running our own
detection models on an on-demand GPU — dropping cost from **~$1.25/video** to
**~$0.02/video** (margins ~62% → ~99%).

## When to do this (don't do it early)
Self-hosting only pays off at **volume**, and adds GPU/cold-start complexity.

- **Now (≈0 paying volume):** keep Roboflow hosted. At the real rate (~$0.0008/inf,
  1 credit = $4, RF-DETR Small ≈ 0.2 credits/1,000 imgs) margins already work.
  Roboflow's own guidance: hosted is the cost-effective choice for *sporadic* traffic.
- **Trigger:** when steady usage makes the ~$1.23/video saving outweigh the GPU
  idle/setup overhead — roughly **a few hundred analyses/month** (≈$300+/mo of
  Roboflow spend), i.e. once there are real paying users.

## Platform: Modal (recommended)
- **Modal** — Python-native, deploy a custom model with one script, true
  scale-to-zero, low ops. Best fit (we write the deploy code; owner doesn't manage
  infra). Slightly higher $/sec than RunPod.
- **RunPod Serverless** — cheaper raw GPU per second; better at high volume but
  more Docker/handler plumbing. Revisit at large scale.
- (Replicate = easiest but priciest; Roboflow Dedicated/Managed Compute = fixed
  monthly GPU, only worth it at high constant load.)

Cheap GPU (T4 / A10) is plenty for RF-DETR (~30 ms/frame on a T4).

## Architecture
Keep the Railway FastAPI backend as the orchestrator; move only the per-frame
**inference** to Modal. The backend already samples frames in memory-bounded
batches — it just calls a different detector.

```
Browser → Vercel → Railway /track,/players,/infer  (samples frames, unchanged)
                         │  batch of frames (base64)
                         ▼
                   Modal GPU function  (RF-DETR ball model + COCO person model)
                         │  detections back
                         ▼
                   Railway maps to court, builds results
```

## Build steps (when triggered)
1. **Owner:** ✅ Modal account created (`mgsinclair1979` — apps:
   https://modal.com/apps/mgsinclair1979/main). When building: `pip install modal`,
   `modal token new` to get a token. (Modal gives monthly free credits to start.)
2. **Get model weights:** export the trained `picklevision-pro/2` (RF-DETR) weights
   from Roboflow (Roboflow lets you download model weights / use the `inference`
   package with a key). For players, bundle a standard COCO model (person class).
3. **Write the Modal app** (`modal/infer.py`): a GPU function (`gpu="T4"`,
   `scaledown_window` for scale-to-zero) that loads both models once per container
   and exposes a web endpoint `POST /detect` taking `{frames: [b64...], model:
   "ball"|"person"}` → returns detections per frame. Use the `inference` package or
   ONNX/Ultralytics to run the weights on GPU.
4. `modal deploy` → get the endpoint URL + set an auth secret.
5. **Railway env:** add `SELFHOST_INFERENCE_URL` + `SELFHOST_INFERENCE_KEY`.
6. **Backend (`main.py`):** behind an env flag `USE_SELFHOST_INFERENCE`, route
   `roboflow_infer` / `person_infer` to the Modal endpoint (send a batch, parse the
   same `{x,y,w,h,class,confidence}` shape). **Keep Roboflow hosted as the
   automatic fallback** if the Modal call fails — so it's a safe flip + instant
   rollback by unsetting the flag.
7. Batch frames per request (e.g. 16–32) to amortise the GPU call.

## Cost & tradeoffs
- **GPU cost:** ~$0.02/video (≈1,550 inferences ≈ <1 min of T4 time; scale-to-zero
  → $0 when idle).
- **Cold start:** a custom-model container can take **~30–60 s** to spin up after
  idle. Mitigate by (a) accepting it on the first analysis after idle (show a
  "warming up" note), or (b) a cheap keep-warm ping during peak hours (small cost).
- **Ops:** manage model weights/versions in the Modal image; redeploy on model
  updates.
- **Fallback:** Roboflow hosted stays wired as the failover, so self-hosting never
  becomes a single point of failure.

## What stays the same
Court calibration, homography mapping, in/out + coverage logic, the frontend, and
the credit-deduction flow are all unchanged — only *where the per-frame detection
runs* changes. Frame counts stay at current values (full accuracy).
