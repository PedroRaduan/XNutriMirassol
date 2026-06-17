import { StaticPage } from "@/components/layout/static-page";

export const metadata = { title: "Sobre a XNutri" };

export default function AboutPage() {
  return (
    <StaticPage
      title="Sobre a XNutri"
      subtitle="Loja de suplementos, moda e acessórios fitness em Mirassol-SP, com atendimento local e compra online."
      sections={[
        { title: "Nossa atuação", body: "A XNutri atende praticantes de musculação, corrida, funcional e pessoas que buscam uma rotina mais saudável com produtos selecionados e orientação próxima." },
        { title: "Curadoria", body: "O catálogo reúne whey protein, creatina, pré-treinos, vitaminas, roupas e acessórios com organização por categoria, estoque controlado e disponibilidade atualizada." },
        { title: "Atendimento local", body: "A operação foi preparada para retirada na loja em Mirassol-SP, entrega regional e integração de frete com Correios." },
      ]}
    />
  );
}
