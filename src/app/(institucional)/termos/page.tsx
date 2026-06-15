import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return (
    <StaticPage
      title="Termos de Uso"
      subtitle="Condições para navegação, compra e uso dos serviços da loja XNutri."
      sections={[
        { title: "Compra", body: "A finalização do pedido depende da disponibilidade de estoque, dados corretos de entrega ou retirada e confirmação de pagamento." },
        { title: "Preços", body: "Preços, cupons e promoções podem variar conforme campanha vigente. O valor válido é o apresentado no resumo do checkout." },
        { title: "Conta", body: "O cliente é responsável por manter seus dados atualizados e preservar a confidencialidade de sua senha." },
      ]}
    />
  );
}
