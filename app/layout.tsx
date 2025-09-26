// app/layout.tsx
export const metadata = {
  title: "JoyScores",
  description: "Charcoal scoreboard with Firebase RTDB sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Purge any legacy service workers that might serve stale shells */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
