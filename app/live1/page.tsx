import dynamic from "next/dynamic";

export const dynamic = "force-static";

const LiveClient = dynamic(() => import("../_shared/LiveClient"), { ssr: false });

export default function Page() {
  return <LiveClient courtId="court1" />;
}
