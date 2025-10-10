export const dynamic = "force-static";
export const revalidate = 0;

import { Suspense } from "react";
import ControllerClient from "./Client";

export default function ControllerPage() {
  return (
    <Suspense>
      <ControllerClient />
    </Suspense>
  );
}
