import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This is the existing public Firebase web-app configuration used by VOX.
// Firebase Security Rules remain responsible for protecting user data.
const firebaseConfig = {
  apiKey: 'AIzaSyC2cLgHHIYXxKx62JCntppUVYJkfWT9wDw',
  authDomain: 'vox-chat-979fd.firebaseapp.com',
  projectId: 'vox-chat-979fd',
  storageBucket: 'vox-chat-979fd.firebasestorage.app',
  messagingSenderId: '49260313546',
  appId: '1:49260313546:web:63a50e8b0f30c8989bed33',
  measurementId: 'G-M7CZN9NER3',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persist Auth sessions across app restarts on both Android and iOS.
let authInstance;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Fast refresh can evaluate this module again after Auth was initialized.
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/already-initialized'
  ) {
    authInstance = getAuth(firebaseApp);
  } else {
    throw error;
  }
}

export const auth = authInstance;
export const db = getFirestore(firebaseApp);
