import Link from "next/link";

export const dynamic = "force-static";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>JoyScores — 5 Courts</h1>
      <h2>Controllers</h2>
      <ul>
        {[1,2,3,4,5].map(n => (
          <li key={n}><Link href={`/controller${n}`}>Controller {n}</Link></li>
        ))}
      </ul>
      <h2>Lives</h2>
      <ul>
        {[1,2,3,4,5].map(n => (
          <li key={n}><Link href={`/live${n}`}>Live {n}</Link></li>
        ))}
      </ul>
    </main>
  );
}
