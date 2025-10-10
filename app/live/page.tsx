export const dynamic = "force-static";
export const revalidate = 0;

import { Suspense } from "react";
import LiveClient from "./Client";

export default function LivePage() {
  return (
    <Suspense>
      <LiveClient />
    </Suspense>
  );
}
