import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["bcrypt", "pg"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com", pathname: "/books/content/**" },
      { protocol: "https", hostname: "books.google.com", pathname: "/books/publisher/content/**" },
      { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};
export default config;
