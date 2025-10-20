export const metadata = {
  title: "JoyScores",
  description: "Charcoal scoreboard with Firebase RTDB sync",
};

// Single layout – no external CSS needed; pages inline what they need.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          background: "#121a21",
          color: "#e9edf3",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        {children}
      </body>
    </html>
  );
}
