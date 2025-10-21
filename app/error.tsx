"use client";

import React from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-slate-300 text-sm mb-4">
          The page hit a client-side error and was stopped safely to protect your session.
        </p>
        <pre className="text-xs bg-slate-800 p-3 rounded-md overflow-auto">{String(error?.message || "Unknown error")}</pre>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-bold"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
