import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Cards from "@/components/Cards";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Card Gallery" };

export default function Page() {
  return (
    <GraphPageShell slug="cards">
      <Cards data={graphData} />
    </GraphPageShell>
  );
}
