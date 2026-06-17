import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "Entrega" };

export default function DeliveryPage() {
  return (
    <StaticPage
      title="Entrega"
      subtitle="Estrutura de frete preparada para Correios, frete manual regional e retirada."
      sections={[
        { title: "Correios", body: "O sistema mantém métodos PAC e Sedex cadastrados, com estrutura pronta para credenciais oficiais e códigos de serviço." },
        { title: "Frete manual", body: "Pedidos para Mirassol e região podem usar frete manual, com prazo e valor definidos pela configuração administrativa." },
        { title: "Validação de CEP", body: "O CEP é validado antes da cotação, e a estrutura de consulta permite integração com ViaCEP e serviços logísticos." },
      ]}
    />
  );
}
