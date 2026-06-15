import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "XNutri | Suplementos e Moda Fitness em Mirassol-SP",
    template: "%s | XNutri",
  },
  description:
    "E-commerce da XNutri em Mirassol-SP com suplementos, whey protein, creatina, pré-treinos, vitaminas, roupas e acessórios fitness.",
  openGraph: {
    title: "XNutri",
    description: "Suplementos e fitness para treinos reais em Mirassol-SP.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
