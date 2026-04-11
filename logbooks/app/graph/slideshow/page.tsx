import type { Metadata } from "next";
import GraphPageShell from "@/components/GraphPageShell";
import Slideshow from "@/components/Slideshow";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Slideshow" };

export default function Page() {
  return (
    <GraphPageShell slug="slideshow">
      <Slideshow data={graphData} />
    </GraphPageShell>
  );
}
