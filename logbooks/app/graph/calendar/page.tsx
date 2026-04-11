import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Calendar from "@/components/Calendar";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Calendar Heatmap" };

export default function Page() {
  return (
    <GraphPageShell slug="calendar">
      <Calendar data={graphData} />
    </GraphPageShell>
  );
}
