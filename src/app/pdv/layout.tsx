import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDV XNutri",
  description: "Sistema de caixa integrado ao e-commerce XNutri.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XNutri PDV",
  },
  icons: {
    apple: [{ url: "/xnutri-pdv-180.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: false, follow: false },
};

export default function PDVLayout({ children }: { children: React.ReactNode }) {
  return children;
}
