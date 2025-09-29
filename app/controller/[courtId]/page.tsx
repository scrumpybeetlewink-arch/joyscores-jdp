// @ts-nocheck
/* eslint-disable */
// app/controller/[courtId]/page.tsx
// Server-only wrapper: pre-generates 5 courts and renders the client Controller.

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ["court1", "court2", "court3", "court4", "court5"].map((c) => ({ courtId: c }));
}

// Accept either Promise or plain object for params (Next 15 differences)
export default async function ControllerPageServer(props: { params: any }) {
  const p = props?.params && typeof props.params.then === "function" ? await props.params : props.params;
  const courtId = p?.courtId ?? "court1";
  return <ClientController courtId={courtId} />;
}

// Import AFTER exports to keep this file server-only
import ClientController from "./ClientController";
