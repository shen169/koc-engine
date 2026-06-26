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
      "https://github.com/shen169/koc-engine",
      // TODO: create these profiles, then uncomment
      // "https://linkedin.com/company/kocengine",
      // "https://crunchbase.com/organization/koc-engine",
      // "https://producthunt.com/products/koc-engine",
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

export function productSchema(params: {
  name: string;
  description: string;
  image?: string;
  category?: string;
  offers?: { price: number; priceCurrency: string };
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: params.name,
    description: params.description,
  };
  if (params.image) schema.image = params.image;
  if (params.category) schema.category = params.category;
  if (params.offers) {
    schema.offers = {
      "@type": "Offer",
      price: params.offers.price,
      priceCurrency: params.offers.priceCurrency,
      availability: "https://schema.org/InStock",
    };
  }
  if (params.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: params.aggregateRating.ratingValue,
      reviewCount: params.aggregateRating.reviewCount,
    };
  }
  return schema;
}

export function reviewSchema(params: {
  itemName: string;
  author: string;
  reviewBody: string;
  ratingValue: number;
  datePublished: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Product", name: params.itemName },
    author: { "@type": "Person", name: params.author },
    reviewBody: params.reviewBody,
    reviewRating: {
      "@type": "Rating",
      ratingValue: params.ratingValue,
      bestRating: 5,
    },
    datePublished: params.datePublished,
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function howToSchema(params: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    description: params.description,
    step: params.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
