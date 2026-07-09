import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Rules — KOC Engine",
  description:
    "KOC Engine platform rules: pledge economy, trust scores, tier progression, SLA deadlines, red line enforcement. Fair for both brands and creators.",
  alternates: { canonical: "/rules" },
};

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
