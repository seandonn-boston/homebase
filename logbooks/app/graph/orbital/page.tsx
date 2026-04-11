import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Orbital Rings" };

export default function Page() {
  return <GraphVariantPage variant="orbital" />;
}
