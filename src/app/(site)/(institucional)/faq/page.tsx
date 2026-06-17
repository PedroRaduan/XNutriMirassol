import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <StaticPage
      title="FAQ"
      subtitle="Respostas para as dúvidas mais comuns sobre compra, entrega, pagamento e retirada."
      sections={[
        { title: "Quais formas de pagamento são aceitas?", body: "O checkout está preparado para Mercado Pago com PIX e cartão. O status do pedido é atualizado automaticamente por webhook após confirmação." },
        { title: "Posso retirar na loja?", body: "Sim. Ao escolher retirada, o frete fica zerado e um protocolo é gerado para apresentar no atendimento." },
        { title: "Como acompanho meu pedido?", body: "Clientes cadastrados podem acessar a área do cliente e consultar histórico, status, itens e valores de pedidos." },
      ]}
    />
  );
}
