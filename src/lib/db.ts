import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// User data type
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  duprId?: string; // DUPR player ID for live ratings
  duprRating?: number; // Live DUPR rating from DUPR API
  proRating: number;
  wins: number;
  losses: number;
  createdAt: Timestamp;
}

// Match data type
export interface Match {
  id: string;
  userId: string;
  date: Timestamp;
  opponent: string;
  yourScore: number;
  opponentScore: number;
  result: 'WIN' | 'LOSS';
  videoUrl?: string;
  ratingChange: number;
  aiAnalysis?: any; // Shot analysis results
  createdAt: Timestamp;
}

// Create/update user profile
export async function createUserProfile(uid: string, email: string, displayName?: string) {
  const userRef = doc(db, 'users', uid);
  const userData: User = {
    uid,
    email,
    displayName: displayName || undefined,
    proRating: 2.0,
    wins: 0,
    losses: 0,
    createdAt: Timestamp.now()
  };
  await setDoc(userRef, userData);
  return userData;
}

// Update user display name
export async function updateDisplayName(uid: string, displayName: string) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    displayName
  });
}

// Upload match video to Firebase Cloud Storage with progress tracking
export async function uploadMatchVideo(
  userId: string,
  matchId: string,
  videoBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const timestamp = Date.now();
    const fileName = `matches/${userId}/${matchId}_${timestamp}.webm`;
    const storageRef = ref(storage, fileName);

    const uploadTask = uploadBytesResumable(storageRef, videoBlob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          onProgress?.(progress);
        },
        (error) => {
          console.error('Error uploading video:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? (docSnap.data() as User) : null;
}

// Save match
export async function saveMatch(userId: string, match: Omit<Match, 'id' | 'userId' | 'createdAt'>) {
  const matchRef = collection(db, 'matches');
  const newDocRef = doc(matchRef);
  const matchData = {
    userId,
    ...match,
    createdAt: Timestamp.now()
  };
  await setDoc(newDocRef, matchData);
  return newDocRef.id;
}

// Get user's recent matches
export async function getUserMatches(userId: string, limitCount: number = 5) {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (Match & { id: string })[];
}

// Update user stats
export async function updateUserStats(uid: string, wins: number, losses: number, proRating: number) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    wins,
    losses,
    proRating
  });
}

// Get top players for leaderboard
export async function getTopPlayers(limitCount: number = 20) {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    orderBy('proRating', 'desc'),
    limit(limitCount)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as (User & { uid: string })[];
}

// Calculate pro rating based on wins/losses
export function calculateProRating(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 2.0;
  const winRate = wins / total;
  return Math.round((2.0 + winRate * 2.0) * 100) / 100; // Rating from 2.0 to 4.0
}

// Save standalone video
export async function saveStandaloneVideo(userId: string, videoUrl: string, title?: string) {
    const videosRef = collection(db, 'videos');
    const newDocRef = doc(videosRef);
    const videoData = {
          userId,
          videoUrl,
          title: title || 'Uploaded Video',
          uploadedAt: Timestamp.now()
    };
    await setDoc(newDocRef, videoData);
    return newDocRef.id;
}

// Get user's videos (both match videos and standalone uploads)
export async function getUserVideos(
  userId: string,
  limitCount: number = 10
): Promise<Array<{ id: string; userId: string; videoUrl: string; title?: string; uploadedAt: Timestamp }>> {
    const videosRef = collection(db, 'videos');
    const q = query(
          videosRef,
          where('userId', '==', userId),
          orderBy('uploadedAt', 'desc'),
          limit(limitCount)
        );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
    })) as Array<{ id: string; userId: string; videoUrl: string; title?: string; up