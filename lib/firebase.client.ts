// lib/firebase.client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

const configFromEnv = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FB_DB_URL,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
};

const fallback = {
  apiKey: "AIzaSyAkBjcAgw9_SdNIOeFQMXVCY0Z37bKGJ3M",
  authDomain: "joyscores-ef086.firebaseapp.com",
  databaseURL: "https://joyscores-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "joyscores",
  storageBucket: "joyscores.firebasestorage.app",
  appId: "1:802840384919:web:4282702bb8d7972b6b20d2",
};

const firebaseConfig = {
  ...fallback,
  ...Object.fromEntries(
    Object.entries(configFromEnv).filter(([, v]) => !!v)
  ),
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app, (configFromEnv.databaseURL || fallback.databaseURL));

export async function ensureAnonLogin() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

// Optional: use emulators on localhost
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  try { connectDatabaseEmulator(db, "127.0.0.1", 9000); } catch {}
  try { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); } catch {}
}
