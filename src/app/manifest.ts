import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_PWA_NAME ?? "XNutri PDV",
    short_name: process.env.NEXT_PUBLIC_PWA_SHORT_NAME ?? "XNutri",
    description: "E-commerce e PDV integrado da XNutri.",
    start_url: "/pdv",
    scope: "/",
    display: "standalone",
    background_color: "#101115",
    theme_color: "#f2382f",
    icons: [
      {
        src: "/xnutri-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
