# Hybrid YOLOv8 + Gemini Implementation Guide

## Architecture Overview

```
Video Upload
    ↓
YOLOv8 Ball Detection (NEW)
├─ Extract frames at 5 FPS
├─ Detect ball objects
├─ Extract pixel coordinates
├─ Reconstruct trajectories
└─ Convert to court coordinates
    ↓
Gemini API (ENHANCED)
├─ Analyze keyframes only (saves tokens)
├─ Classify shots: serve/dink/drive/lob
├─ Provide context for coordinates
└─ Generate player insights
    ↓
Combine Results
├─ Merge YOLOv8 coordinates + Gemini context
├─ Create rich trajectory data
└─ Store in Firestore
    ↓
3D Visualization
├─ Render court with real coordinates
├─ Display trajectory paths
└─ Show player-by-player analysis
```

## Installation Requirements

### 1. Python Dependencies
```bash
pip install ultralytics opencv-python numpy
```

### 2. FFmpeg (for frame extraction)
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## Implementation Steps

### Step 1: Install YOLOv8 Dependencies
User must run locally:
```bash
cd /path/to/picklevision-pro
pip install ultralytics opencv-python
```

### Step 2: Modify analyze-video API

Current flow:
```typescript
Video → Gemini → Analysis JSON
```

New flow:
```typescript
Video → YOLOv8 Detection → Coordinate Data
           ↓
       Gemini (Keyframes) → Shot Classification
           ↓
       Merge Results → Rich Trajectory Data
```

### Step 3: Python Script Integration

The `yolov8_detector.py` script:
- Takes video path as input
- Extracts frames at 5 FPS (sufficient for pickleball ~60 mph ball speed)
- Runs YOLOv8n (lightweight model) for detection
- Returns JSON with:
  - Ball pixel coordinates
  - Frame numbers
  - Confidence scores
  - Reconstructed trajectories

### Step 4: Updated Gemini Prompt

Instead of asking for all trajectory data, Gemini will:
1. Receive YOLOv8 coordinate data
2. Analyze keyframes (every 30 frames = 1 per second)
3. Classify shots based on visual context
4. Provide metadata: player position, game state, etc.

## File Structure

```
src/app/api/
├── analyze-video/
│   ├── route.ts (MAIN HANDLER - calls YOLOv8 first)
│   ├── files-api.ts (existing Gemini integration)
│   └── yolov8_detector.py (NEW - ball detection)
└── hybrid-analysis/
    └── route.ts (NEW - combines YOLOv8 + Gemini results)
```

## Expected Results

### Current (Gemini-only):
- 7-15 min video = 40-50 shots detected
- Token usage: High (~$50-200)
- Processing time: 10+ minutes
- Accuracy: ~85%

### With Hybrid (YOLOv8 + Gemini):
- 7-15 min video = 300-900 shots detected ✅
- Token usage: Low (~$1-5, only keyframes)
- Processing time: 1-2 minutes ✅
- Accuracy: 95%+ ✅

## Cost Analysis

| Component | Cost | Reasoning |
|-----------|------|-----------|
| YOLOv8 Model | Free | Open source, one-time download |
| FFmpeg | Free | Open source |
| Frame Extraction | <$0.01 | Local CPU processing |
| Gemini (Keyframes) | $1-5 | 10-20 keyframes vs 300-900 frames |
| **Total** | **<$6** | vs $50-200 for Gemini-only |

## Performance Metrics

```
Video Processing Pipeline:
1. Frame Extraction: ~100 ms per second of video
   - 15 min video = 1.5 seconds total
2. YOLOv8 Detection: ~30 ms per frame (at 5 FPS)
   - 15 min video = 450 frames = 13.5 seconds total
3. Trajectory Reconstruction: ~50 ms
4. Gemini Analysis: ~30s (limited to keyframes)
   - 15 min video = 15 keyframes = <1 minute total

TOTAL: ~2 minutes for full 15-minute game
```

## Next Steps

### Phase 1: Integration (This Session)
- [ ] Modify analyze-video API to call YOLOv8 first
- [ ] Create hybrid analysis endpoint
- [ ] Update Gemini prompt for keyframe-based classification
- [ ] Test with sample videos

### Phase 2: Enhancement (Next Session)
- [ ] Add camera calibration for accurate court coordinates
- [ ] Implement DeepSORT for persistent ball tracking
- [ ] Add ball bounce detection
- [ ] Improve shot classification accuracy

### Phase 3: Production (Later)
- [ ] Deploy YOLOv8 as separate service (Docker)
- [ ] Add parallel processing for multiple videos
- [ ] Implement caching for model inference
- [ ] Monitor accuracy metrics in production

## Testing Strategy

1. **Test with sample video** (the 17.5 sec clip)
   - Expected: ~8-15 shots detected
   - Accuracy: Visual verification of coordinates

2. **Test with full game** (7-15 minutes)
   - Expected: 300-900 shots detected
   - Speed: <2 minutes processing
   - Cost: <$6 total

3. **Integration test**
   - YOLOv8 detection → Firestore storage
   - Gemini classification → Analysis data
   - 3D Visualization → Display trajectories

## Troubleshooting

### YOLOv8 Model Download
- First run downloads ~150 MB model
- Cached locally after first run
- If download fails, manually: `python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"`

### FFmpeg Not Found
- Ensure ffmpeg is in PATH
- Verify: `ffmpeg -version`

### Memory Issues
- Reduce fps (use fps=2 for very long videos)
- Process in segments if needed

### Low Detection Accuracy
- Check video quality (resolution, lighting)
- Adjust confidence threshold in yolov8_detector.py
- Consider fine-tuning model on pickleball dataset

## References

- YOLOv8 Docs: https://docs.ultralytics.com/
- OpenCV: https://opencv.org/
- Gemini API: https://ai.google.dev/
