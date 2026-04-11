import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import HorizontalTrunk from "@/components/HorizontalTrunk";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Horizontal Trunk" };

export default function Page() {
  return (
    <GraphPageShell slug="horizontal">
      <HorizontalTrunk data={graphData} />
    </GraphPageShell>
  );
}
