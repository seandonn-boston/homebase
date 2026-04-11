import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Crystal Lattice" };

export default function Page() {
  return <GraphVariantPage variant="lattice" />;
}
