import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to KOC Engine",
  description:
    "Sign in to KOC Engine — the AI-powered KOC matching platform for cross-border e-commerce brands and creators.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
