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

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  duprId?: string;
  duprRating?: number;
  proRating: number;
  wins: number;
  losses: number;
  subscription?: 'free' | 'pro' | 'admin';
  subscriptionStartDate?: Timestamp;
  subscriptionEndDate?: Timestamp;
  createdAt: Timestamp;
}

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
  aiAnalysis?: any;
  createdAt: Timestamp;
}

export async function createUserProfile(uid: string, email: string, displayName?: string, subscription: 'free' | 'pro' | 'admin' = 'free') {
  const userRef = doc(db, 'users', uid);
  const userData: User = {
    uid,
    email,
    displayName: displayName || undefined,
    proRating: 2.0,
    wins: 0,
    losses: 0,
    subscription,
    createdAt: Timestamp.now()
  };
  await setDoc(userRef, userData);
  return userData;
}

export async function updateDisplayName(uid: string, displayName: string) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { displayName });
}

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
      uploadTask.on('state_changed',
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

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? (docSnap.data() as User) : null;
}

export async function saveMatch(userId: string, match: Omit<Match, 'id' | 'userId' | 'createdAt'>) {
  const matchRef = collection(db, 'matches');
  const newDocRef = doc(matchRef);
  const matchData = { userId, ...match, createdAt: Timestamp.now() };
  await setDoc(newDocRef, matchData);
  return newDocRef.id;
}

export async function getUserMatches(userId: string, limitCount: number = 5) {
  const matchesRef = collection(db, 'matches');
  const q = query(matchesRef, where('userId', '==', userId), orderBy('date', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Match & { id: string })[];
}

export async function updateUserStats(uid: string, wins: number, losses: number, proRating: number) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { wins, losses, proRating });
}

export async function getTopPlayers(limitCount: number = 20) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('proRating', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as (User & { uid: string })[];
}

export function calculateProRating(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 2.0;
  const winRate = wins / total;
  return Math.round((2.0 + winRate * 2.0) * 100) / 100;
}

export async function saveStandaloneVideo(userId: string, videoUrl: string, title?: string) {
  const videosRef = collection(db, 'videos');
  const newDocRef = doc(videosRef);
  const videoData = { userId, videoUrl, title: title || 'Uploaded Video', uploadedAt: Timestamp.now() };
  await setDoc(newDocRef, videoData);
  return newDocRef.id;
}

export async function getUserVideos(
  userId: string,
  limitCount: number = 10
): Promise<Array<{ id: string; userId: string; videoUrl: string; title?: string; uploadedAt: Timestamp }>> {
  const videosRef = collection(db, 'videos');
  const q = query(videosRef, where('userId', '==', userId), orderBy('uploadedAt', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<{ id: string; userId: string; videoUrl: string; title?: string; uploadedAt: Timestamp }>;
}

export async function deleteVideo(videoId: string, videoUrl: string, userId?: string) {
  try {
    // Delete from main videos collection
    const videoRef = doc(db, 'videos', videoId);
    await deleteDoc(videoRef);

    // Delete from user's videoAnalyses subcollection if userId provided
    if (userId) {
      const userAnalysisRef = doc(db, `users/${userId}/videoAnalyses`, videoId);
      await deleteDoc(userAnalysisRef);
    }

    // Try to delete from Cloud Storage (non-critical)
    try {
      const url = new URL(videoUrl);
      const pathParts = url.pathname.split('/o/')[1].split('?')[0];
      const filePath = decodeURIComponent(pathParts);
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (storageError) {
      console.warn('Could not delete file from Cloud Storage:', storageError);
    }
    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
}

export async function saveVideoAnalysis(userId: string, videoIdOrData: string | any, analysisData?: any) {
  try {
    let docId: string;
    let dataToSave: any;

    if (typeof videoIdOrData === 'string' && analysisData) {
      docId = videoIdOrData;
      dataToSave = { ...analysisData, videoId: videoIdOrData, analyzedAt: Timestamp.now() };
    } else {
      docId = Date.now().toString();
      dataToSave = { ...videoIdOrData, analyzedAt: Timestamp.now(), createdAt: Timestamp.now() };
    }

    const analysisRef = doc(db, `users/${userId}/videoAnalyses`, docId);
    await setDoc(analysisRef, dataToSave);
    console.log('✅ Video analysis saved:', docId);
    return analysisRef;
  } catch (error) {
    console.error('Error saving video analysis:', error);
    throw error;
  }
}

export async function getUserVideoAnalyses(userId: string, limitCount: number = 20): Promise<Array<any>> {
  try {
    const analysesRef = collection(db, `users/${userId}/videoAnalyses`);
    const q = query(analysesRef, orderBy('analyzedAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting video analyses:', error);
    return [];
  }
}
