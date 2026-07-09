import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your KOC Engine Account — Free for Creators & Brands",
  description:
    "Join KOC Engine as a creator or brand. Get 200pt (creators) or 100pt (brands) signup bonus. Start collaborating with AI-matched partners today.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
