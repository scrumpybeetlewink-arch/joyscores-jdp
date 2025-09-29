// app/live/[courtId]/page.tsx
// Server wrapper: exports static params and renders the client live view.

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { courtId: string };

export function generateStaticParams(): Params[] {
  return ["court1", "court2", "court3", "court4", "court5"].map((c) => ({ courtId: c }));
}

export default function LivePageServer({ params }: { params: Params }) {
  return <ClientLive courtId={params.courtId} />;
}

import ClientLive from "./ClientLive";
