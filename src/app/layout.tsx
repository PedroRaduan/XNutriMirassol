import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "XNutri",
  category: "ecommerce",
  keywords: ["XNutri", "suplementos", "whey protein", "creatina", "moda fitness", "Mirassol", "SP"],
  title: {
    default: "XNutri | Suplementos e Moda Fitness em Mirassol-SP",
    template: "%s | XNutri",
  },
  description:
    "E-commerce da XNutri em Mirassol-SP com suplementos, whey protein, creatina, pré-treinos, vitaminas, moda fitness e acessórios.",
  openGraph: {
    title: "XNutri | Suplementos e Moda Fitness",
    description: "Suplementos e fitness para treinos reais em Mirassol-SP.",
    type: "website",
    locale: "pt_BR",
    siteName: "XNutri",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "XNutri Suplementos Nutricionais" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "XNutri | Suplementos e Moda Fitness",
    description: "Suplementos e fitness para treinos reais em Mirassol-SP.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/xnutri-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
