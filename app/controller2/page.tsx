import dynamic from "next/dynamic";

export const dynamic = "force-static";

const ControllerClient = dynamic(() => import("../_shared/ControllerClient"), { ssr: false });

export default function Page() {
  return <ControllerClient courtId="court2" />;
}
