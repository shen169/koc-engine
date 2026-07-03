const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KOC Engine",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description:
      "Making creator-brand collaboration accessible for everyone, not just the biggest brands and influencers. KOC Engine connects cross-border sellers with vetted small creators through dual-pledge escrow and AI matching.",
    foundingDate: "2026",
    sameAs: [
      "https://twitter.com/kocengine",
      "https://reddit.com/user/kocengine",
      "https://github.com/shen169/koc-engine",
      "https://linkedin.com/company/kocengine",
      "https://crunchbase.com/organization/koc-engine",
      "https://producthunt.com/products/koc-engine",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "honghuishen24@gmail.com",
      availableLanguage: ["English", "Chinese"],
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KOC Engine",
    url: SITE_URL,
    description:
      "Making creator-brand collaboration accessible for everyone. AI-powered KOC matching platform with dual-pledge escrow for cross-border e-commerce.",
    inLanguage: ["en-US", "zh-CN"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    dateModified: new Date().toISOString().split("T")[0],
  };
}

export function webApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "KOC Engine",
    url: SITE_URL,
    description:
      "Making creator-brand collaboration accessible for everyone. AI-powered platform connecting cross-border e-commerce brands with vetted KOC creators for authentic product reviews and content.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    dateModified: new Date().toISOString().split("T")[0],
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

export function articleSchema(params: {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.headline,
    description: params.description,
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    author: {
      "@type": "Person",
      name: params.authorName || "KOC Engine",
    },
    publisher: {
      "@type": "Organization",
      name: "KOC Engine",
      url: SITE_URL,
    },
    ...(params.image && { image: params.image }),
  };
}

export function personSchema(params: {
  name: string;
  jobTitle?: string;
  description?: string;
  url?: string;
  sameAs?: string[];
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: params.name,
    ...(params.jobTitle && { jobTitle: params.jobTitle }),
    ...(params.description && { description: params.description }),
    ...(params.url && { url: params.url }),
    ...(params.sameAs && { sameAs: params.sameAs }),
    ...(params.image && { image: params.image }),
    worksFor: {
      "@type": "Organization",
      name: "KOC Engine",
      url: SITE_URL,
    },
  };
}

export function webPageSchema(params: {
  name: string;
  description: string;
  url: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: params.name,
    description: params.description,
    url: params.url,
    ...(params.dateModified && { dateModified: params.dateModified }),
    isPartOf: {
      "@type": "WebSite",
      name: "KOC Engine",
      url: SITE_URL,
    },
  };
}
