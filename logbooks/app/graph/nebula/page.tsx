import type { Metadata } from "next";
import GraphVariantPage from "@/components/GraphVariantPage";

export const metadata: Metadata = { title: "Nebular Cloud" };

export default function Page() {
  return <GraphVariantPage variant="nebula" />;
}
