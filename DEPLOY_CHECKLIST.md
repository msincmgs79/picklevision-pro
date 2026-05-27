# PickleVision Pro - Deployment Checklist

**Version:** v1.0.2 (Analytics Fix)  
**Date:** May 27, 2026  
**Deployer:** Martin Sinclair

---

## Pre-Deployment (Local Testing)

### Step 1: Verify File Changes
```bash
cd ~/picklevision-pro
git status
```

**Expected changes:**
- Modified: `src/app/page.tsx` (opponent modal + fixed aggregation functions)

### Step 2: Install Dependencies
```bash
npm install --legacy-peer-deps
```

### Step 3: Run Development Server
```bash
npm run dev
```

**Expected output:**
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 4: Test Analyze + Opponent Modal

1. Open http://localhost:3000 in browser
2. Login with test account
3. Upload or select existing video
4. Click "📊 Analyze" button
5. Wait 30-60 seconds for analysis
6. **Verify: Modal appears asking "Who was your opponent?"**
7. Enter opponent name (e.g., "John Smith")
8. Click "Save Analysis" button
9. **Verify: Navigates to analysis results (Screen10)**
10. **Verify: Console shows "✅ Analysis auto-saved to Firestore with opponent: John Smith"**

### Step 5: Test Stats Display

1. From home screen, click "📊 Analytics" (or navigate to Stats)
2. Wait for data to load
3. **Verify: Overview tab shows:**
   - ✅ SHOT MIX percentages (NOT all 0%)
   - ✅ Shows "from X videos" label
   - ✅ TECHNIQUE ANALYSIS with Footwork/Positioning/Consistency scores
4. **Verify: Player Breakdown tab shows:**
   - ✅ Opponent name (e.g., "John Smith") in list
   - ✅ Click opponent name shows detailed record
   - ✅ Win-Loss count and win percentage display

### Step 6: Test Multiple Videos

If you have time, analyze 2-3 more videos with different opponent names:

1. Analyze another video (different opponent)
2. Provide different opponent name
3. Return to Stats
4. **Verify: Both opponent names appear in Player Breakdown**
5. **Verify: Shot percentages reflect ALL analyzed videos**

### Step 7: Check Browser Console

```bash
# Open DevTools (F12 → Console tab)
# Look for these messages:
```

✅ `✅ Loaded video analyses: [...]`
✅ `✅ Analysis auto-saved to Firestore with opponent: ...`

❌ **No red errors** - if you see errors, note them

### Step 8: Build for Production

```bash
npm run build
```

**Expected output:**
```
✓ Creating an optimized production build
✓ Compiled successfully
```

**If build fails:**
- Note the error
- Fix the issue
- Try building again

---

## GitHub Commit

### Step 1: Stage Changes
```bash
git add -A
git status
```

**Verify only `src/app/page.tsx` is modified**

### Step 2: Create Commit Message
```bash
git commit -m "Fix: Correct analytics aggregation and add opponent name capture

- Fixed aggregateShotStats() to use shotBreakdown.shotCounts
- Fixed aggregateTechniqueStats() to use techniqueAnalysis ratings  
- Added opponent name modal after video analysis completes
- Updated getOpponentRecords() to group by actual opponent names
- All stats now display correctly instead of showing 0%
- Maintains backward compatibility with existing analyses

Related to: Shot breakdown showing 0% and missing opponent ID"
```

### Step 3: Push to GitHub
```bash
git push origin main
```

**Expected output:**
```
Counting objects: X changed, Y insertions(+), Z deletions(-)
...
main -> main
```

**⏰ Wait 2-5 minutes for Vercel to deploy automatically**

---

## Post-Deployment Testing

### Step 1: Check Vercel Deployment

1. Go to https://vercel.com
2. Log in to your account
3. Find PickleVision Pro project
4. **Verify deployment status shows "Ready"**
5. Click visit button to go to live app URL

### Step 2: Test in Production

1. **Login** with your test account
2. **Analyze a video** on live app
   - Click "📊 Analyze" on a video
   - **Verify modal appears**
   - Enter opponent name
   - **Verify auto-saves and navigates to results**
3. **View Stats** on live app
   - Click "📊 Analytics"
   - **Verify shot percentages display (not 0%)**
   - **Verify opponent names show in Player Breakdown**
4. **Test on Mobile** (if possible)
   - Visit app on phone
   - Test same flow
   - **Verify modal and stats display correctly**

### Step 3: Verify Console Logs

On live app, open DevTools (F12 → Console):
- ✅ `✅ Analysis auto-saved to Firestore with opponent: ...`
- ✅ No red errors related to analytics

### Step 4: Check Firestore

1. Go to https://console.firebase.google.com
2. Select your PickleVision project
3. Go to Firestore Database
4. Navigate to: `users/{your-user-id}/videoAnalyses/`
5. Open any document
6. **Verify fields visible:**
   - ✅ `opponent` field with name
   - ✅ `shotBreakdown.shotCounts` with actual numbers
   - ✅ `techniqueAnalysis` with ratings

---

## Rollback Plan (If Issues)

If something goes wrong after deployment:

### Quick Rollback (Revert Last Commit)
```bash
git revert HEAD --no-edit
git push origin main
```

**Vercel will redeploy the previous version (2-5 min)**

### Alternative: Disable Deploy

1. Go to Vercel dashboard
2. Find PickleVision project settings
3. Disable auto-deployments temporarily
4. Fix the issue locally
5. Commit and re-enable

---

## Troubleshooting

### Issue: Modal doesn't appear after analysis

**Solution:**
1. Check browser console (F12)
2. Look for JavaScript errors
3. Verify React state updates
4. Clear browser cache: Ctrl+Shift+Delete

### Issue: Stats show 0% still

**Solution:**
1. Verify Firestore has new analyses with `shotBreakdown.shotCounts`
2. Hard refresh page (Ctrl+Shift+R)
3. Check browser console for data loading errors
4. Clear sessionStorage: `sessionStorage.clear()` in console

### Issue: Opponent names don't appear

**Solution:**
1. Verify modal is being shown (test in dev mode)
2. Check Firestore document has `opponent` field
3. Verify `getOpponentRecords()` is reading field correctly
4. Check browser console for errors

### Issue: Vercel deployment stuck

**Solution:**
1. Go to Vercel dashboard
2. Click "Redeploy" button
3. Or wait 10 minutes and refresh

---

## Success Indicators ✅

After deployment, the app should:

1. ✅ Show opponent modal after video analysis
2. ✅ Save opponent name to Firestore
3. ✅ Display shot percentages correctly (not 0%)
4. ✅ Show real opponent names in Player Breakdown
5. ✅ Calculate win percentages properly
6. ✅ No console errors
7. ✅ Works on mobile and desktop

---

## Performance Notes

After these changes:
- **Load time:** No change (same queries, just correct aggregation)
- **Database writes:** Same (adds `opponent` field, negligible impact)
- **Database reads:** No change (existing queries still work)
- **Frontend performance:** No change (same rendering logic)

---

## Monitoring After Deployment

**For next 24 hours:**
- Monitor Vercel analytics for error rate
- Check Firebase console for any issues
- Monitor browser error reporting (if enabled)

**If you notice issues:**
- Take a screenshot of error
- Check browser console (F12)
- Check Vercel deployment logs
- Note timestamp and reproduce steps

---

## Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Local Testing | 15-20 min | Install, test, verify |
| Build | 2-3 min | npm run build |
| Git Commit | 1 min | Stage and commit |
| Git Push | 1 min | Push to GitHub |
| **Vercel Deploy** | **2-5 min** | Wait for auto-deployment |
| Production Test | 10-15 min | Test on live app |
| **Total** | **~35-50 min** | Recommended buffer: 1 hour |

---

## Sign-Off

After completing all steps:

- [ ] Local testing passed
- [ ] Build successful
- [ ] Git push successful
- [ ] Vercel deployment successful
- [ ] Production testing passed
- [ ] Stats display correctly
- [ ] No console errors
- [ ] Opponent modal works
- [ ] Player Breakdown shows names

**Deployment completed successfully:** _____________________ (date/time)

---

## Contact Support

If you encounter issues not listed in Troubleshooting:

1. Check Vercel logs: https://vercel.com/dashboard/projects
2. Check Firebase logs: https://console.firebase.google.com
3. Review FIX_SUMMARY.md for implementation details
4. Check console.log messages in page.tsx

---

**Good luck! 🚀**
