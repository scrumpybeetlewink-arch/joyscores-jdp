"use client";
import Link from "next/link";

export default function IndexPage(){
  const items = ["court1","court2","court3","court4","court5"];
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo">JOY<strong>SCORES</strong></div>
          <span className="tag">Charcoal · 5 Courts</span>
        </div>
        <div className="last">Firebase · Export</div>
      </header>
      <main className="card" style={{display:"grid", gap:12}}>
        {items.map((c,i)=>(
          <div key={c} className="row" style={{display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:10}}>
            <div><strong>{`Court ${i+1}`}</strong></div>
            <Link className="btn" href={`/controller/?court=${c}`}>Controller</Link>
            <Link className="btn" href={`/live/?court=${c}`}>Live</Link>
          </div>
        ))}
      </main>
    </div>
  );
}
