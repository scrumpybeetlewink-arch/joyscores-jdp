// app/controller/[courtId]/page.tsx
// Server wrapper: statically exports courts and renders client Controller UI.

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ["court1", "court2", "court3", "court4", "court5"].map((c) => ({ courtId: c }));
}

// NOTE: We deliberately avoid strict typing for params because some Next 15 setups
// type it as a Promise, others as a plain object. This wrapper supports both.
export default async function ControllerPageServer(props: { params: any }) {
  const params = (props.params && typeof props.params.then === "function")
    ? await props.params
    : props.params;

  const courtId: string = params?.courtId ?? "court1";
  return <ClientController courtId={courtId} />;
}

// Import after exports to keep this file server-only
import ClientController from "./ClientController";
