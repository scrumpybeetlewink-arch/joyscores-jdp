import dynamic from "next/dynamic";

const ClientController = dynamic(() => import("./ClientController"), {
  ssr: false,
  loading: () => <div className="p-6 text-white">Loading…</div>,
});

export default function Page() {
  return <ClientController />;
}
