import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Typographic from "@/components/Typographic";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Typographic Flow" };

export default function Page() {
  return (
    <GraphPageShell slug="typographic">
      <Typographic data={graphData} />
    </GraphPageShell>
  );
}
