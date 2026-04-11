import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Helix" };

export default function Page() {
  return <GraphVariantPage variant="helix" />;
}
