// DUPR API Integration
const DUPR_API_BASE = 'https://api.dupr.io/v1';

export interface DUPRPlayer {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
  singles: {
    rating: number;
    ratingDeviation: number;
  };
  doubles: {
    rating: number;
    ratingDeviation: number;
  };
}

/**
 * Search for a player by email or name on DUPR
 */
export async function searchDUPRPlayer(email: string): Promise<DUPRPlayer | null> {
  try {
    const response = await fetch(
      `${DUPR_API_BASE}/players?email=${encodeURIComponent(email)}`
    );
    if (!response.ok) {
      console.error('DUPR search failed:', response.status);
      return null;
    }
    const data = await response.json();
    // DUPR returns an array, get the first match
    if (data && Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return null;
  } catch (error) {
    console.error('Error searching DUPR:', error);
    return null;
  }
}

/**
 * Get player by DUPR ID
 */
export async function getDUPRPlayer(duprId: string): Promise<DUPRPlayer | null> {
  try {
    const response = await fetch(`${DUPR_API_BASE}/players/${duprId}`);
    if (!response.ok) {
      console.error('DUPR fetch failed:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching DUPR player:', error);
    return null;
  }
}

/**
 * Get combined rating (average of singles and doubles)
 */
export function getCombinedRating(player: DUPRPlayer): number {
  const singles = player.singles?.rating || player.rating || 0;
  const doubles = player.doubles?.rating || player.rating || 0;
  return Math.round((singles + doubles) / 2 * 100) / 100;
}

/**
 * Get singles rating
 */
export function getSinglesRating(player: DUPRPlayer): number {
  return player.singles?.rating || player.rating || 0;
}

/**
 * Get doubles rating
 */
export function getDoublesRating(player: DUPRPlayer): number {
  return player.doubles?.rating || player.rating || 0;
}
