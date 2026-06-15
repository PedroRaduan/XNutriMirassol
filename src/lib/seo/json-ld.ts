import { getBaseUrl } from "@/lib/utils";

export function organizationJsonLd() {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "XNutri",
    url: baseUrl,
    image: `${baseUrl}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rua 9 de Julho, 1250",
      addressLocality: "Mirassol",
      addressRegion: "SP",
      postalCode: "15130-000",
      addressCountry: "BR",
    },
    paymentAccepted: ["PIX", "Credit Card"],
    currenciesAccepted: "BRL",
  };
}
