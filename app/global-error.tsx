// app/global-error.tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: any; reset: () => void }) {
  useEffect(() => {
    // log full error to console with stack so we can pinpoint offending code
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  const msg =
    (error?.digest ? `Digest: ${error.digest}\n` : "") +
    (error?.message ?? String(error));

  return (
    <html>
      <body style={{ background: "#0b0f17", color: "#fee2e2", fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Something went wrong on this page
          </h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "rgba(255, 0, 0, 0.08)",
              border: "1px solid rgba(255, 0, 0, 0.25)",
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
{msg}
          </pre>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: "#1f2937",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
