import Link from "next/link";

export const dynamic = "force-static";

const courts = ["court1","court2","court3","court4","court5"] as const;

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>JoyScores — 5 Courts</h1>
      <h2>Controller</h2>
      <ul>
        {courts.map((c) => (
          <li key={c}><Link href={`/controller${c.slice(-1)}`}>{c}</Link></li>
        ))}
      </ul>
      <h2>Live</h2>
      <ul>
        {courts.map((c) => (
          <li key={c}><Link href={`/live${c.slice(-1)}`}>{c}</Link></li>
        ))}
      </ul>
    </main>
  );
}
