import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Ribbon from "@/components/Ribbon";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Ribbon" };

export default function Page() {
  return (
    <GraphPageShell slug="ribbon">
      <Ribbon data={graphData} />
    </GraphPageShell>
  );
}
