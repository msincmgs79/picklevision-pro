import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDnfKNfbca9mmFl-cumVwxCvLaWeGlpcII",
  authDomain: "picklevision-pro.firebaseapp.com",
  projectId: "picklevision-pro",
  storageBucket: "picklevision-pro.firebasestorage.app",
  messagingSenderId: "58306693263",
  appId: "1:58306693263:web:92e53d7e54e8f5548e08fa",
  measurementId: "G-4E5X974JEE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
