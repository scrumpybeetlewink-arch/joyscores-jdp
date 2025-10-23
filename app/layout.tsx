import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "JoyScores — 5 Courts", description: "Firebase-ready" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
