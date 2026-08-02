import { Footer } from "@/components/layout/footer";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";
import { Header } from "@/components/layout/header";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { serializeJsonLd } from "@/lib/security/json-ld";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd()) }} />
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
