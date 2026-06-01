# Feature Gating & Subscription Setup Guide

## Overview
PickleVision Pro now supports three subscription levels with feature gating:
- **FREE**: Limited access, 1 match/month, 5GB storage
- **PRO**: $19.99/month - Unlimited access
- **ADMIN**: Master account with all features, no subscription

## Setup Instructions

### 1. Create Your Master Admin Account

**Method: Firebase Console**

1. Go to: https://console.firebase.google.com
2. Select `picklevision-pro` project
3. Go to **Authentication** → **Users**
4. Click **Add User** (or use your existing account: mgsinclair1979@gmail.com)
5. Go to **Firestore** → **users** collection
6. Add/Update your user document with:

```json
{
  "uid": "YOUR_UID",
  "email": "mgsinclair1979@gmail.com",
  "displayName": "Martin",
  "proRating": 2.0,
  "wins": 0,
  "losses": 0,
  "subscription": "admin",
  "createdAt": "2026-05-24T...",
  "subscriptionStartDate": null,
  "subscriptionEndDate": null
}
```

### 2. Feature Access by Subscription Level

| Feature | Free | Pro | Admin |
|---------|------|-----|-------|
| Advanced Analytics | ❌ | ✅ | ✅ |
| Player Tracking | ❌ | ✅ | ✅ |
| Unlimited Matches | ❌ | ✅ | ✅ |
| Unlimited Storage | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| Premium Leaderboard | ❌ | ✅ | ✅ |

### 3. Using Feature Gating in Code

```tsx
import { getFeatureAccess, canAccessFeature } from '@/lib/featureGate';

// Get all access levels for a user
const access = getFeatureAccess(userSubscription);

// Check specific feature
if (!canAccessFeature(userSubscription, 'canAccessAdvancedAnalytics')) {
  return <PaywallModal feature="Advanced Analytics" />;
}

// Use access data
if (access.canAccessPlayerTracking) {
  // Show player tracking features
}
```

### 4. Implementation Checklist

- ✅ Feature gating logic created (`src/lib/featureGate.ts`)
- ✅ User model updated with subscription field
- ⏳ Lock Advanced Analytics pages (Shot Analysis, Technique, Trends tabs)
- ⏳ Add video storage limit check
- ⏳ Add paywall modal component
- ⏳ Integrate checks into Analytics page
- ⏳ Integrate checks into Videos page
- ⏳ Test with Free account (upgrade prompt)
- ⏳ Test with Admin account (full access)

### 5. Firestore Indexes

No new indexes needed - existing user queries remain the same.

### 6. Testing

**Test as Free User:**
1. Create new Firebase user
2. Set subscription: "free"
3. Try to access Analytics → should see paywall
4. Try to upload video > 5GB → should see storage limit

**Test as Pro User:**
1. Create user with subscription: "pro"
2. All features should be accessible

**Test as Admin User:**
1. Use your master account (subscription: "admin")
2. All features should be accessible without paywalls

### 7. Next Steps

After pushing this code:
1. Set up your admin account in Firestore
2. Integrate paywall checks into Analytics page
3. Add storage limit enforcement in Videos page
4. Create paywall modal component
5. Deploy to Vercel and test

## File Changes

- `src/lib/featureGate.ts` - NEW: Feature gating logic
- `src/lib/db.ts` - UPDATED: Added subscription fields to User model
