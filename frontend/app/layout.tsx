import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";
const SITE_NAME = "KOC Engine";
const SITE_TAGLINE =
  "Making creator-brand collaboration accessible for everyone, not just the biggest brands and influencers.";
const SITE_DESCRIPTION =
  `${SITE_TAGLINE} KOC Engine connects cross-border sellers with vetted small creators. Dual-pledge escrow ensures fair deals. No monthly fees — per-task pricing.`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF2F8" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2937" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "zh-CN": "/zh",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/images/og-image.svg",
        width: 1200,
        height: 630,
        alt: "KOC Engine — AI-Powered Creator Matching",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/images/og-image.svg"],
    creator: "@kocengine",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  keywords: [
    "KOC platform", "influencer marketing", "Amazon influencer alternative",
    "TikTok creator matching", "UGC creator marketplace", "cross-border ecommerce",
    "KOC marketing", "creator collaboration platform", "brand deal platform",
    "Amazon seller marketing", "DTC brand influencer", "Shopify influencer app",
  ],
  authors: [{ name: "KOC Engine" }],
  creator: "KOC Engine",
  publisher: "KOC Engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "KOC Engine",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": SITE_DESCRIPTION,
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD",
    },
    "author": {
      "@type": "Organization",
      "name": "KOC Engine",
      "url": SITE_URL,
      "sameAs": [
        "https://github.com/shen169/koc-engine",
        "https://x.com/kocengine",
        "https://reddit.com/r/kocengine",
      ],
    },
  };

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
