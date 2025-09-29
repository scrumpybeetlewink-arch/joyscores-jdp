// app/controller/[courtId]/page.tsx
// Server wrapper: exports static params and renders the client controller.

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { courtId: string };

export function generateStaticParams(): Params[] {
  return ["court1", "court2", "court3", "court4", "court5"].map((c) => ({ courtId: c }));
}

export default async function ControllerPageServer(
  { params }: { params: Promise<Params> }
) {
  const { courtId } = await params;
  return <ClientController courtId={courtId} />;
}

// Import AFTER exports to keep this file server-only
import ClientController from "./ClientController";
