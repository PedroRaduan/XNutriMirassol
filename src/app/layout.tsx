import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "XNutri | Suplementos e Moda Fitness em Mirassol-SP",
    template: "%s | XNutri",
  },
  description:
    "E-commerce da XNutri em Mirassol-SP com suplementos, whey protein, creatina, pre-treinos, vitaminas, roupas e acessorios fitness.",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
