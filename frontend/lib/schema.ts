const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KOC Engine",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description:
      "AI-powered KOC matching platform for cross-border e-commerce. Connect Amazon sellers and DTC brands with vetted TikTok creators.",
    foundingDate: "2026",
    sameAs: [
      "https://twitter.com/kocengine",
      "https://reddit.com/user/kocengine",
    ],
  };
}

export function webApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "KOC Engine",
    url: SITE_URL,
    description:
      "AI-powered platform connecting cross-border e-commerce brands with vetted KOC creators for authentic product reviews and content.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
