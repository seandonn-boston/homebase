import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Lantern Procession" };

export default function Page() {
  return <GraphVariantPage variant="lanterns" />;
}
