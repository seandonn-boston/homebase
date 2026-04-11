import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Terrain from "@/components/Terrain";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Elevation" };

export default function Page() {
  return (
    <GraphPageShell slug="terrain">
      <Terrain data={graphData} />
    </GraphPageShell>
  );
}
