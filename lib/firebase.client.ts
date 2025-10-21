// lib/firebase.client.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, connectAuthEmulator, type Auth } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";

const env = {
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

const cfg = { ...fallback, ...Object.fromEntries(Object.entries(env).filter(([,v]) => !!v)) };

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Database | null = null;

function ensureFirebase() {
  if (typeof window === "undefined") return;
  if (!_app) _app = getApps().length ? getApp() : initializeApp(cfg);
  if (!_auth) _auth = getAuth(_app);
  if (!_db) _db = getDatabase(_app, env.databaseURL || fallback.databaseURL);

  if (window.location.hostname === "localhost") {
    try { connectDatabaseEmulator(_db!, "127.0.0.1", 9000); } catch {}
    try { connectAuthEmulator(_auth!, "http://127.0.0.1:9099", { disableWarnings: true }); } catch {}
  }
}

// SSR-safe placeholders; real instances in the browser
export const app  = (typeof window !== "undefined" ? (ensureFirebase(), _app!)  : (null as unknown as FirebaseApp));
export const auth = (typeof window !== "undefined" ? (ensureFirebase(), _auth!) : (null as unknown as Auth));
export const db   = (typeof window !== "undefined" ? (ensureFirebase(), _db!)   : (null as unknown as Database));

export async function ensureAnonLogin() {
  if (typeof window === "undefined") return;
  ensureFirebase();
  try { if (!_auth?.currentUser) await signInAnonymously(_auth!); } catch {}
}
