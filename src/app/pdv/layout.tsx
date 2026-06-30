import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDV XNutri",
  description: "Sistema de caixa integrado ao e-commerce XNutri.",
};

export default function PDVLayout({ children }: { children: React.ReactNode }) {
  return children;
}
