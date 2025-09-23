// app/error.tsx
"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="p-6 text-red-200">
      <h2 className="text-lg font-semibold">Page error</h2>
      <pre className="mt-2 text-sm whitespace-pre-wrap">
        {String(error?.message ?? error)}
      </pre>
      <button className="mt-4 px-3 py-2 rounded bg-slate-700" onClick={() => reset()}>
        Retry
      </button>
    </div>
  );
}
