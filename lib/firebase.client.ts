"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import {
  getDatabase,
  connectDatabaseEmulator,
  type Database,
} from "firebase/database";

/**
 * Client-only Firebase singletons with SSR-safe exports.
 * - Same API: `app`, `auth`, `db`, `ensureAnonLogin`.
 * - During SSR/build, exports are placeholders (typed via `as unknown as ...`)
 *   so TypeScript is satisfied and the server never initializes Firebase.
 * - In the browser, real instances are created lazily once and reused.
 */

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
  databaseURL:
    "https://joyscores-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "joyscores",
  storageBucket: "joyscores.firebasestorage.app",
  appId: "1:802840384919:web:4282702bb8d7972b6b20d2",
};

const firebaseConfig = {
  ...fallback,
  ...Object.fromEntries(Object.entries(configFromEnv).filter(([, v]) => !!v)),
};

// Lazily-filled client singletons
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Database | null = null;

function ensureFirebase() {
  if (typeof window === "undefined") return; // SSR: do nothing

  if (!_app) _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!_auth) _auth = getAuth(_app);
  if (!_db) _db = getDatabase(_app, configFromEnv.databaseURL || fallback.databaseURL);

  // Optional emulators in local dev
  if (window.location.hostname === "localhost") {
    try { connectDatabaseEmulator(_db!, "127.0.0.1", 9000); } catch {}
    try { connectAuthEmulator(_auth!, "http://127.0.0.1:9099", { disableWarnings: true }); } catch {}
  }
}

// Exports: placeholders on server, real instances in browser
export const app: FirebaseApp =
  (typeof window !== "undefined" ? (ensureFirebase(), _app!) : (null as unknown as FirebaseApp));

export const auth: Auth =
  (typeof window !== "undefined" ? (ensureFirebase(), _auth!) : (null as unknown as Auth));

export const db: Database =
  (typeof window !== "undefined" ? (ensureFirebase(), _db!) : (null as unknown as Database));

// Safe to call from client components; no-op on server
export async function ensureAnonLogin() {
  if (typeof window === "undefined") return;
  ensureFirebase();
  try {
    if (!_auth?.currentUser) await signInAnonymously(_auth!);
  } catch {
    // swallow to avoid UI crashes (network/permissions/etc.)
  }
}
