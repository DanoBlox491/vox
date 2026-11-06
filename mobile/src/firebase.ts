import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined
};

const requiredConfig: (keyof FirebaseOptions)[] = [
  "apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"
];
const missingConfig = requiredConfig.filter((key) => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  throw new Error(
    "VOX Mobile is missing Firebase configuration. Copy .env.example to .env and fill in: " +
    missingConfig.join(", ")
  );
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firebaseAuth: Auth;
try {
  firebaseAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch {
  // Fast Refresh can evaluate this module again after Auth is initialized.
  firebaseAuth = getAuth(firebaseApp);
}

export const auth = firebaseAuth;
export const db = getFirestore(firebaseApp);
