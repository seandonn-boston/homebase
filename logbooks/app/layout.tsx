import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";
import Narrator from "@/components/Narrator";

export const metadata: Metadata = {
  title: {
    template: "%s — The Helm Chronicle",
    default: "The Helm Chronicle — Logbooks",
  },
  description:
    "How a manuscript became a governed codebase in fifty-two days. Engineering logbooks from the Helm project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
        <Narrator />
      </body>
    </html>
  );
}
