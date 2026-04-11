import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import SpiralRose from "@/components/SpiralRose";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Spiral Rose" };

export default function Page() {
  return (
    <GraphPageShell slug="spiral">
      <SpiralRose data={graphData} />
    </GraphPageShell>
  );
}
