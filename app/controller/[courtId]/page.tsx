// app/controller/[courtId]/page.tsx
// Server wrapper: exports static params and renders the client controller.

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { courtId: string };

export function generateStaticParams(): Params[] {
  // Add/rename courts here when you scale
  return ["court1", "court2", "court3", "court4", "court5"].map((c) => ({ courtId: c }));
}

export default function ControllerPageServer({ params }: { params: Params }) {
  // Render the client component and pass the param as a prop
  return <ClientController courtId={params.courtId} />;
}

// Import AFTER exports to keep this file server-only
import ClientController from "./ClientController";
