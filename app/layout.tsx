// app/layout.tsx
export const metadata = {
  title: "JoyScores",
  description: "Charcoal scoreboard with Firebase RTDB sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* 🔤 Global font + color scheme (applies to all pages immediately) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root { color-scheme: dark; }
              *, *::before, *::after { box-sizing: border-box; }
              html, body {
                margin: 0;
                font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
                  Arial, "Noto Sans", "Liberation Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
              }
              button, input, select, a, div, span {
                font-family: inherit;
              }
            `,
          }}
        />

        {children}

        {/* 🧹 Purge legacy service workers ONCE to avoid stale shells / flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if ('serviceWorker' in navigator && !localStorage.getItem('__sw_purged__')) {
                  navigator.serviceWorker.getRegistrations?.().then(rs => {
                    for (const r of rs) r.unregister();
                    localStorage.setItem('__sw_purged__', '1');
                  });
                }
              } catch {}
            `,
          }}
        />
      </body>
    </html>
  );
}
