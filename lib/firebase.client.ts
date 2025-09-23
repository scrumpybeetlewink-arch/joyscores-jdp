// lib/firebase.client.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import {
  initializeAuth,
  browserLocalPersistence,
  getAuth,
  type Auth,
} from "firebase/auth";

type InitStatus = { ok: boolean; message?: string };
export let firebaseInitStatus: InitStatus = { ok: true };

function read(name: string) {
  return process.env[name] ?? "";
}

const firebaseConfig = {
  apiKey: read("NEXT_PUBLIC_FB_API_KEY"),
  authDomain: read("NEXT_PUBLIC_FB_AUTH_DOMAIN"),
  databaseURL: read("NEXT_PUBLIC_FB_DB_URL"),
  projectId: read("NEXT_PUBLIC_FB_PROJECT_ID"),
  // Must be "<project-id>.appspot.com"
  storageBucket: read("NEXT_PUBLIC_FB_STORAGE_BUCKET"),
  appId: read("NEXT_PUBLIC_FB_APP_ID"),
};

let app: FirebaseApp | null = null;
let db: Database | null = null;
let auth: Auth | null = null;

try {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    firebaseInitStatus = {
      ok: false,
      message: `Missing Firebase env(s): ${missing.join(", ")}`,
    };
    // continue with partial config; UI will render banner
  }

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getDatabase(app);
  if (typeof window !== "undefined") {
    try {
      auth = initializeAuth(app, { persistence: browserLocalPersistence });
    } catch {
      auth = getAuth(app);
    }
  }
} catch (e) {
  console.error("[firebase.client] init error:", e);
  firebaseInitStatus = { ok: false, message: String(e) };
}

export { app, db, auth };

/** Optional helper: anonymous sign-in if available */
export async function ensureAnonLogin() {
  if (!auth) return;
  if (!auth.currentUser) {
    const { signInAnonymously } = await import("firebase/auth");
    await signInAnonymously(auth);
  }
}
