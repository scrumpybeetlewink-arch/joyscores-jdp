// app/live/[courtId]/page.tsx
// Server wrapper: exports static params and renders the client live view.

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { courtId: string };

export function generateStaticParams(): Params[] {
  return ["court1", "court2", "court3", "court4", "court5"].map((c) => ({ courtId: c }));
}

export default async function LivePageServer(
  { params }: { params: Promise<Params> }
) {
  const { courtId } = await params;
  return <ClientLive courtId={courtId} />;
}

import ClientLive from "./ClientLive";
