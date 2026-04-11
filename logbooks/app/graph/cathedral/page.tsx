import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Cathedral Tiers" };

export default function Page() {
  return <GraphVariantPage variant="cathedral" />;
}
