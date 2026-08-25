import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelPreviewSource = isVercelPreview ? " https://vercel.live" : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}${vercelPreviewSource}`,
  "script-src-attr 'none'",
  `style-src 'self' 'unsafe-inline'${vercelPreviewSource}`,
  `img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com${
    isVercelPreview ? " https://vercel.live https://vercel.com" : ""
  }`,
  `font-src 'self' data:${isVercelPreview ? " https://vercel.live https://assets.vercel.com" : ""}`,
  `connect-src 'self'${isProduction ? "" : " ws://localhost:* ws://127.0.0.1:*"}${
    isVercelPreview ? " https://vercel.live wss://ws-us3.pusher.com" : ""
  }`,
  `frame-src 'self' https://*.pagseguro.com https://*.pagseguro.uol.com.br${vercelPreviewSource}`,
  "form-action 'self' https://*.pagseguro.com https://*.pagseguro.uol.com.br",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
          ...(isProduction
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
      ...["/admin/:path*", "/cliente/:path*", "/pdv/:path*", "/pedido/:path*", "/checkout/:path*", "/carrinho/:path*"].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      })),
      ...["/admin-sw.js", "/pdv-sw.js"].map((source) => ({
        source,
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      })),
    ];
  },
};

export default nextConfig;
