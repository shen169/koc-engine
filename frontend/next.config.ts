import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/((?!api/|_next/|favicon\\.svg|images/|llms\\.txt|llms-full\\.txt|robots\\.txt|rss\\.xml|sitemap\\.xml|sitemap\\.[^.]+\\.xml|.well-known/).*)",
        has: [{ type: "host", value: "www.kocengine.com" }],
        destination: "https://kocengine.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
