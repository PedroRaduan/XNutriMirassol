import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <StaticPage
      title="Dúvidas frequentes"
      subtitle="Respostas para as dúvidas mais comuns sobre compra, entrega, pagamento e retirada."
      sections={[
        { title: "Posso retirar na loja?", body: "Sim. Escolha retirada no checkout para ficar sem frete. Após a confirmação do pedido, geramos um protocolo para apresentar no atendimento da XNutri em Mirassol/SP." },
        { title: "Vocês entregam em Mirassol?", body: "Sim. O site está preparado para entrega regional e também para frete por Correios conforme o CEP informado no carrinho." },
        { title: "Como funciona o pagamento?", body: "O checkout usa Mercado Pago para PIX e cartão. Após a confirmação do pagamento, o status do pedido pode ser atualizado automaticamente." },
        { title: "Como sei se o produto está disponível?", body: "Os produtos trabalham com estoque integrado. Quando há poucas unidades ou indisponibilidade, o site mostra esse status antes da compra." },
        { title: "Posso tirar dúvidas pelo WhatsApp?", body: "Pode sim. Use o botão fixo de WhatsApp, o link no topo, no rodapé ou na página do produto para falar com a equipe da loja." },
        { title: "Como funcionam trocas e devoluções?", body: "As solicitações são avaliadas conforme a política da loja, estado do produto e prazo legal. Para agilizar, tenha em mãos o número do pedido e fale pelo WhatsApp." },
      ]}
    />
  );
}
