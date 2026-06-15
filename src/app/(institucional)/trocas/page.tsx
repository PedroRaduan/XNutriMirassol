import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "Trocas e Devoluções" };

export default function ExchangesPage() {
  return (
    <StaticPage
      title="Trocas e Devoluções"
      subtitle="Política preparada para atendimento transparente e rastreável."
      sections={[
        { title: "Prazo", body: "Solicitações de arrependimento seguem o prazo legal de 7 dias corridos após o recebimento. Trocas por tamanho, avaria ou divergência devem ser solicitadas pelo atendimento." },
        { title: "Condição do produto", body: "Suplementos devem estar lacrados. Roupas e acessórios precisam estar sem sinais de uso, com embalagem e etiquetas quando aplicável." },
        { title: "Processo", body: "A equipe analisa o pedido, orienta postagem ou retirada e registra a tratativa vinculada ao histórico do cliente." },
      ]}
    />
  );
}
