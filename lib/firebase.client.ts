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
 * IMPORTANT:
 * - This module is client-only (note the "use client" directive).
 * - It must only be imported from Client Components or client pages.
 * - All browser-only calls are guarded so it cannot throw during SSR/export.
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

// ——— Safe singletons (initialised on first client use) ———
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Database | null = null;

function ensureFirebase() {
  // If somehow executed on the server, do nothing (callers are guarded).
  if (typeof window === "undefined") return;

  if (!_app) _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!_auth) _auth = getAuth(_app);
  if (!_db) _db = getDatabase(_app, configFromEnv.databaseURL || fallback.databaseURL);

  // Optional emulators in local dev
  if (window.location.hostname === "localhost") {
    try {
      connectDatabaseEmulator(_db!, "127.0.0.1", 9000);
    } catch {}
    try {
      connectAuthEmulator(_auth!, "http://127.0.0.1:9099", { disableWarnings: true });
    } catch {}
  }
}

// Named exports (read-only) — they’ll be null on server, non-null in browser after ensureFirebase()
export const app: FirebaseApp = (() => {
  if (typeof window !== "undefined") {
    ensureFirebase();
    return _app!;
  }
  // placeholder to satisfy types during SSR; never used at runtime
  // @ts-expect-error server placeholder
  return null;
})();

export const auth: Auth = (() => {
  if (typeof window !== "undefined") {
    ensureFirebase();
    return _auth!;
  }
  // @ts-expect-error server placeholder
  return null;
})();

export const db: Database = (() => {
  if (typeof window !== "undefined") {
    ensureFirebase();
    return _db!;
  }
  // @ts-expect-error server placeholder
  return null;
})();

// Anonymous auth helper (safe if called during SSR)
export async function ensureAnonLogin() {
  if (typeof window === "undefined") return;
  ensureFirebase();
  try {
    if (!_auth?.currentUser) {
      await signInAnonymously(_auth!);
    }
  } catch {
    // swallow auth errors to avoid crashing the UI (network/permission/etc.)
  }
}
