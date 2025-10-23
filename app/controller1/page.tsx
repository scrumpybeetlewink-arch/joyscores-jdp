export const dynamic = "force-static";

import ControllerClient from "../_shared/ControllerClient";

export default function Page() {
  return <ControllerClient courtId="court1" />;
}
