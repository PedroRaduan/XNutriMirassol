import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacidade"
      subtitle="Tratamento de dados voltado a compra segura, atendimento e obrigações legais."
      sections={[
        { title: "Dados coletados", body: "Coletamos dados de cadastro, endereço, contato, itens comprados e informações transacionais necessárias para processar pedidos." },
        { title: "Pagamentos", body: "Dados sensíveis de pagamento são processados pelo Mercado Pago. A loja armazena apenas identificadores, status e metadados necessários para conciliação." },
        { title: "Segurança", body: "O sistema usa hash de senha, validação de entrada, proteção de rotas administrativas, CSRF das Server Actions e rate limiting em pontos sensíveis." },
        { title: "Uso e retenção", body: "Os dados são usados somente para cadastro, atendimento, entrega, retirada, prevenção a fraudes e cumprimento de obrigações legais. Mantemos apenas o necessário pelo período aplicável a cada finalidade." },
        { title: "Seus direitos", body: "Você pode solicitar confirmação, correção, portabilidade ou exclusão de dados quando a legislação permitir. Entre em contato pelos canais oficiais informados na página de contato." },
        { title: "Compartilhamento", body: "Compartilhamos somente os dados indispensáveis com serviços de pagamento, hospedagem, banco de dados, entrega e armazenamento de imagens usados para operar a loja." },
      ]}
    />
  );
}
