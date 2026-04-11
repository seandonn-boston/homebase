import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Constellation from "@/components/Constellation";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Constellation Map" };

export default function Page() {
  return (
    <GraphPageShell slug="constellation">
      <Constellation data={graphData} />
    </GraphPageShell>
  );
}
