import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Growing Tree" };

export default function Page() {
  return <GraphVariantPage variant="tree" />;
}
