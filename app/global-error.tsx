"use client";

import React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <h1 className="text-xl font-bold mb-2">App Error</h1>
          <p className="text-slate-300 text-sm mb-4">
            A client-side exception occurred. You can retry below.
          </p>
          <pre className="text-xs bg-slate-800 p-3 rounded-md overflow-auto">{String(error?.message || "Unknown error")}</pre>
          <button
            onClick={() => reset()}
            className="mt-4 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-bold"
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
