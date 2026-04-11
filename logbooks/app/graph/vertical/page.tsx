import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import VerticalTrunk from "@/components/VerticalTrunk";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Vertical Trunk" };

export default function Page() {
  return (
    <GraphPageShell slug="vertical">
      <VerticalTrunk data={graphData} />
    </GraphPageShell>
  );
}
