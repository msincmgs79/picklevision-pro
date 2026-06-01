/**
 * Feature Gating & Access Control
 * Determines which features are available based on subscription level
 */

export type SubscriptionLevel = 'free' | 'pro' | 'admin';

export interface FeatureAccess {
  canAccessAdvancedAnalytics: boolean;
  canAccessPlayerTracking: boolean;
  canAccessUnlimitedStorage: boolean;
  canAccessUnlimitedMatches: boolean;
  canAccessPrioritySupport: boolean;
  canAccessPremiumLeaderboard: boolean;
  maxVideoStorageGB: number;
  maxMatchesPerMonth: number;
}

/**
 * Get feature access based on subscription level
 * Defaults to 'free' if subscription is not set
 */
export const getFeatureAccess = (subscription?: SubscriptionLevel): FeatureAccess => {
  const baseFeatures = {
    free: {
      canAccessAdvancedAnalytics: false,
      canAccessPlayerTracking: false,
      canAccessUnlimitedStorage: false,
      canAccessUnlimitedMatches: false,
      canAccessPrioritySupport: false,
      canAccessPremiumLeaderboard: false,
      maxVideoStorageGB: 5,
      maxMatchesPerMonth: 1,
    },
    pro: {
      canAccessAdvancedAnalytics: true,
      canAccessPlayerTracking: true,
      canAccessUnlimitedStorage: true,
      canAccessUnlimitedMatches: true,
      canAccessPrioritySupport: true,
      canAccessPremiumLeaderboard: true,
      maxVideoStorageGB: 999999,
      maxMatchesPerMonth: 999999,
    },
    admin: {
      canAccessAdvancedAnalytics: true,
      canAccessPlayerTracking: true,
      canAccessUnlimitedStorage: true,
      canAccessUnlimitedMatches: true,
      canAccessPrioritySupport: true,
      canAccessPremiumLeaderboard: true,
      maxVideoStorageGB: 999999,
      maxMatchesPerMonth: 999999,
    },
  };

  const sub = subscription ?? 'free';
  return baseFeatures[sub];
};

/**
 * Check if user can access a specific feature
 * Defaults to 'free' if subscription is not set
 */
export const canAccessFeature = (
  subscription: SubscriptionLevel | undefined,
  feature: keyof FeatureAccess
): boolean => {
  const access = getFeatureAccess(subscription);
  const value = access[feature];

  // For boolean features, return the value directly
  if (typeof value === 'boolean') {
    return value;
  }

  return false;
};

/**
 * Determine if feature access requires upgrade
 * Returns true if user is free (or undefined) and feature requires pro
 */
export const requiresProUpgrade = (subscription: SubscriptionLevel | undefined, feature: keyof FeatureAccess): boolean => {
  const sub = subscription ?? 'free';
  return sub === 'free' && !canAccessFeature(subscription, feature);
};

/**
 * Get upgrade prompt for feature
 */
export const getUpgradePrompt = (feature: string): string => {
  const prompts: Record<string, string> = {
    advancedAnalytics: 'Advanced Analytics is a Pro feature. Upgrade to unlock shot analysis, techniques, and trends.',
    playerTracking: 'Player Tracking is a Pro feature. Upgrade to track player stats and performance.',
    unlimitedStorage: 'You\'ve reached your free video storage limit. Upgrade to Pro for unlimited storage.',
    unlimitedMatches: 'You\'ve reached your monthly match limit (1). Upgrade to Pro for unlimited matches.',
    prioritySupport: 'Priority support is a Pro feature. Upgrade to get faster responses.',
    premiumLeaderboard: 'Premium Leaderboard is a Pro feature. Upgrade for exclusive rankings.',
  };

  return prompts[feature] || 'This is a Pro feature. Upgrade to unlock it.';
};
