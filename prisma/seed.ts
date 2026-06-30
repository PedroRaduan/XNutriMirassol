import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import slugify from "slugify";

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL precisa estar definida para executar o seed.");
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

type SeedProduct = {
  category: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  shortDescription: string;
  description: string;
  imageUrl: string;
  featured?: boolean;
  bestSeller?: boolean;
  promotion?: boolean;
  weightGrams: number;
  variants: Array<{
    name: string;
    sku: string;
    attributes: Record<string, string>;
    stock: number;
    priceAdjustment?: number;
    costPrice?: number;
    packagingCost?: number;
  }>;
};

const categorySeeds = [
  {
    key: "suplementos",
    name: "Suplementos",
    description: "Whey, creatina, pré-treinos, vitaminas e itens de apoio para performance.",
    imageUrl:
      "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "whey-protein",
    name: "Whey Protein",
    description: "Proteínas para pós-treino, receitas e metas diárias.",
    imageUrl:
      "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "creatina",
    name: "Creatina",
    description: "Creatinas e blends para força, potência e consistência.",
    imageUrl:
      "https://images.unsplash.com/photo-1596357395217-80de13130e92?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "pre-treino",
    name: "Pré-treino",
    description: "Energia, foco e pump para treinos mais intensos.",
    imageUrl:
      "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "vitaminas",
    name: "Vitaminas",
    description: "Vitaminas, minerais e bem-estar para rotina ativa.",
    imageUrl:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "roupas-fitness",
    name: "Moda Fitness",
    description: "Peças confortáveis para treinar com mobilidade e estilo.",
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "masculino",
    name: "Masculino",
    description: "Roupas e acessórios fitness masculinos.",
    imageUrl:
      "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "feminino",
    name: "Feminino",
    description: "Roupas e acessórios fitness femininos.",
    imageUrl:
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "acessorios",
    name: "Acessórios",
    description: "Coqueteleiras, straps e itens de apoio para treino.",
    imageUrl:
      "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "promocoes",
    name: "Promoções",
    description: "Ofertas, combos e queimas de estoque da XNutri.",
    imageUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  },
];

const supplementFlavors = ["Chocolate", "Baunilha", "Morango"];
const clothingSizes = ["Modelo principal"];

const products: SeedProduct[] = [
  {
    category: "suplementos",
    name: "Whey Protein Isolado XNutri 900g",
    sku: "XN-WHEY-ISO-900",
    price: 169.9,
    compareAtPrice: 189.9,
    shortDescription: "Whey isolado com alta concentração proteica e baixa lactose.",
    description:
      "Fórmula premium para quem busca recuperação muscular eficiente, alta digestibilidade e excelente perfil de aminoácidos por dose.",
    imageUrl:
      "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    bestSeller: true,
    promotion: true,
    weightGrams: 1050,
    variants: supplementFlavors.map((flavor, index) => ({
      name: flavor,
      sku: `XN-WHEY-ISO-900-${index + 1}`,
      attributes: { sabor: flavor, peso: "900g" },
      stock: 24 - index * 3,
    })),
  },
  {
    category: "suplementos",
    name: "Whey Protein Concentrado XNutri 1kg",
    sku: "XN-WHEY-CON-1KG",
    price: 119.9,
    shortDescription: "Proteína concentrada para uso diário com ótimo custo-benefício.",
    description:
      "Ideal para bater metas de proteína com praticidade, textura cremosa e sabores pensados para receitas fitness.",
    imageUrl:
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    bestSeller: true,
    weightGrams: 1150,
    variants: supplementFlavors.map((flavor, index) => ({
      name: flavor,
      sku: `XN-WHEY-CON-1KG-${index + 1}`,
      attributes: { sabor: flavor, peso: "1kg" },
      stock: 32 - index * 4,
    })),
  },
  {
    category: "suplementos",
    name: "Whey 3W XNutri Performance 900g",
    sku: "XN-WHEY-3W-900",
    price: 149.9,
    shortDescription: "Blend de whey concentrado, isolado e hidrolisado.",
    description:
      "Combina velocidades de absorção para suporte proteico completo no pós-treino ou entre refeições.",
    imageUrl:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80",
    bestSeller: true,
    weightGrams: 1050,
    variants: supplementFlavors.map((flavor, index) => ({
      name: flavor,
      sku: `XN-WHEY-3W-900-${index + 1}`,
      attributes: { sabor: flavor, peso: "900g" },
      stock: 18 - index,
    })),
  },
  {
    category: "suplementos",
    name: "Whey Zero Lactose XNutri 750g",
    sku: "XN-WHEY-ZL-750",
    price: 139.9,
    shortDescription: "Proteína sem lactose para dietas sensíveis.",
    description:
      "Opção leve e prática para manter ingestão proteica sem abrir mão de sabor e conforto digestivo.",
    imageUrl:
      "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 900,
    variants: ["Chocolate", "Cookies"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-WHEY-ZL-750-${index + 1}`,
      attributes: { sabor: flavor, peso: "750g" },
      stock: 15 - index * 2,
    })),
  },
  {
    category: "suplementos",
    name: "Protein Blend XNutri Night 800g",
    sku: "XN-BLEND-NIGHT-800",
    price: 134.9,
    shortDescription: "Blend proteico para saciedade e recuperação noturna.",
    description:
      "Mistura de proteínas com digestão gradual, indicada para complementar a dieta antes de dormir.",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 950,
    variants: ["Chocolate Belga", "Baunilha"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-BLEND-NIGHT-800-${index + 1}`,
      attributes: { sabor: flavor, peso: "800g" },
      stock: 13 + index,
    })),
  },
  {
    category: "suplementos",
    name: "Whey Protein Sachê XNutri Pack 12un",
    sku: "XN-WHEY-SACHE-12",
    price: 79.9,
    shortDescription: "Doses individuais para levar na bolsa ou mochila.",
    description:
      "Pacote com 12 sachês de whey para rotina corrida, viagens e controle preciso de porções.",
    imageUrl:
      "https://images.unsplash.com/photo-1605296866985-34ba3c531d5c?auto=format&fit=crop&w=1200&q=80",
    promotion: true,
    weightGrams: 520,
    variants: ["Mix sabores"].map((flavor) => ({
      name: flavor,
      sku: "XN-WHEY-SACHE-12-MIX",
      attributes: { sabor: flavor, unidades: "12" },
      stock: 36,
    })),
  },
  {
    category: "suplementos",
    name: "Creatina Monohidratada XNutri 300g",
    sku: "XN-CREA-MONO-300",
    price: 89.9,
    compareAtPrice: 99.9,
    shortDescription: "Creatina pura micronizada para força e potência.",
    description:
      "Creatina monohidratada sem sabor, fácil de misturar e indicada para ciclos contínuos de desempenho.",
    imageUrl:
      "https://images.unsplash.com/photo-1596357395217-80de13130e92?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    bestSeller: true,
    promotion: true,
    weightGrams: 420,
    variants: ["Sem sabor"].map((flavor) => ({
      name: flavor,
      sku: "XN-CREA-MONO-300-SS",
      attributes: { sabor: flavor, peso: "300g" },
      stock: 42,
    })),
  },
  {
    category: "suplementos",
    name: "Creatina Creapure XNutri 250g",
    sku: "XN-CREA-CREA-250",
    price: 119.9,
    shortDescription: "Matéria-prima premium para alta pureza.",
    description:
      "Creatina com padrão premium, ideal para atletas que buscam consistência de qualidade e rastreabilidade.",
    imageUrl:
      "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?auto=format&fit=crop&w=1200&q=80",
    bestSeller: true,
    weightGrams: 360,
    variants: ["Sem sabor"].map((flavor) => ({
      name: flavor,
      sku: "XN-CREA-CREA-250-SS",
      attributes: { sabor: flavor, peso: "250g" },
      stock: 28,
    })),
  },
  {
    category: "suplementos",
    name: "Creatina Gummies XNutri 60un",
    sku: "XN-CREA-GUM-60",
    price: 74.9,
    shortDescription: "Creatina em gummies para suplementação prática.",
    description:
      "Formato mastigável para quem quer praticidade sem shaker, com porções controladas e sabor frutado.",
    imageUrl:
      "https://images.unsplash.com/photo-1612532275214-e4ca76d0e4d1?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 300,
    variants: ["Frutas vermelhas", "Laranja"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-CREA-GUM-60-${index + 1}`,
      attributes: { sabor: flavor, unidades: "60" },
      stock: 22 - index,
    })),
  },
  {
    category: "suplementos",
    name: "Creatina + Beta Alanina XNutri 300g",
    sku: "XN-CREA-BA-300",
    price: 99.9,
    shortDescription: "Blend para potência, resistência e intensidade.",
    description:
      "Combina creatina monohidratada e beta alanina em fórmula pensada para treinos de alta demanda.",
    imageUrl:
      "https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 420,
    variants: ["Limão", "Sem sabor"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-CREA-BA-300-${index + 1}`,
      attributes: { sabor: flavor, peso: "300g" },
      stock: 17 + index,
    })),
  },
  {
    category: "suplementos",
    name: "Pre-Treino XPump XNutri 300g",
    sku: "XN-PRE-XPUMP-300",
    price: 109.9,
    compareAtPrice: 129.9,
    shortDescription: "Energia e pump para treinos intensos.",
    description:
      "Fórmula com cafeína, citrulina e taurina para foco, disposição e melhor sensação muscular durante o treino.",
    imageUrl:
      "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    promotion: true,
    weightGrams: 430,
    variants: ["Blue ice", "Melancia", "Limão"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-PRE-XPUMP-300-${index + 1}`,
      attributes: { sabor: flavor, peso: "300g" },
      stock: 16 - index,
    })),
  },
  {
    category: "suplementos",
    name: "Pre-Treino Caffeine Free XNutri 250g",
    sku: "XN-PRE-FREE-250",
    price: 94.9,
    shortDescription: "Pré-treino sem cafeína para treinos noturnos.",
    description:
      "Opção com foco em vasodilatação e resistência, sem estimulantes, para quem treina à noite.",
    imageUrl:
      "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 360,
    variants: ["Uva", "Tangerina"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-PRE-FREE-250-${index + 1}`,
      attributes: { sabor: flavor, peso: "250g" },
      stock: 11 + index,
    })),
  },
  {
    category: "suplementos",
    name: "Energy Shot XNutri 12un",
    sku: "XN-SHOT-12",
    price: 59.9,
    shortDescription: "Shots de energia para consumo rápido.",
    description:
      "Caixa com 12 unidades de shot energético para dias corridos, treinos rápidos e competições.",
    imageUrl:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=1200&q=80",
    bestSeller: true,
    weightGrams: 850,
    variants: ["Limão", "Tropical"].map((flavor, index) => ({
      name: flavor,
      sku: `XN-SHOT-12-${index + 1}`,
      attributes: { sabor: flavor, unidades: "12" },
      stock: 30 - index * 4,
    })),
  },
  {
    category: "suplementos",
    name: "Pump Caps XNutri 120 caps",
    sku: "XN-PUMP-CAPS-120",
    price: 84.9,
    shortDescription: "Cápsulas para suporte de pump e foco.",
    description:
      "Cápsulas práticas para incluir na rotina pré-treino com dosagem simples e sem preparo.",
    imageUrl:
      "https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 230,
    variants: ["120 cápsulas"].map((flavor) => ({
      name: flavor,
      sku: "XN-PUMP-CAPS-120-UN",
      attributes: { formato: flavor },
      stock: 19,
    })),
  },
  {
    category: "suplementos",
    name: "Multivitamínico XNutri Daily 120 caps",
    sku: "XN-VIT-MULTI-120",
    price: 64.9,
    shortDescription: "Vitaminas e minerais para rotina ativa.",
    description:
      "Combinação de micronutrientes essenciais para complementar a alimentação e apoiar energia diária.",
    imageUrl:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    bestSeller: true,
    weightGrams: 220,
    variants: ["120 cápsulas"].map((flavor) => ({
      name: flavor,
      sku: "XN-VIT-MULTI-120-UN",
      attributes: { formato: flavor },
      stock: 34,
    })),
  },
  {
    category: "suplementos",
    name: "Omega 3 XNutri Ultra 90 caps",
    sku: "XN-VIT-OMEGA-90",
    price: 79.9,
    shortDescription: "EPA e DHA para saúde cardiovascular.",
    description:
      "Cápsulas de ômega 3 com concentração equilibrada para suporte à rotina de bem-estar.",
    imageUrl:
      "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80",
    bestSeller: true,
    weightGrams: 240,
    variants: ["90 cápsulas"].map((flavor) => ({
      name: flavor,
      sku: "XN-VIT-OMEGA-90-UN",
      attributes: { formato: flavor },
      stock: 26,
    })),
  },
  {
    category: "suplementos",
    name: "Vitamina D3 + K2 XNutri 60 caps",
    sku: "XN-VIT-D3K2-60",
    price: 54.9,
    shortDescription: "Suporte a ossos, imunidade e metabolismo.",
    description:
      "Fórmula com vitamina D3 e K2 em cápsulas de fácil ingestão para uso diário.",
    imageUrl:
      "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 160,
    variants: ["60 cápsulas"].map((flavor) => ({
      name: flavor,
      sku: "XN-VIT-D3K2-60-UN",
      attributes: { formato: flavor },
      stock: 21,
    })),
  },
  {
    category: "suplementos",
    name: "Magnésio Dimalato XNutri 120 tabs",
    sku: "XN-VIT-MAG-120",
    price: 69.9,
    shortDescription: "Magnésio para desempenho e recuperação.",
    description:
      "Comprimidos de magnésio dimalato para suporte muscular, metabolismo energético e rotina ativa.",
    imageUrl:
      "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 260,
    variants: ["120 tabletes"].map((flavor) => ({
      name: flavor,
      sku: "XN-VIT-MAG-120-UN",
      attributes: { formato: flavor },
      stock: 18,
    })),
  },
  {
    category: "suplementos",
    name: "Vitamina C + Zinco XNutri 90 caps",
    sku: "XN-VIT-CZ-90",
    price: 44.9,
    shortDescription: "Suporte antioxidante e imunidade.",
    description:
      "Combinação de vitamina C e zinco para complementar a rotina de cuidados diários.",
    imageUrl:
      "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=1200&q=80",
    promotion: true,
    weightGrams: 190,
    variants: ["90 cápsulas"].map((flavor) => ({
      name: flavor,
      sku: "XN-VIT-CZ-90-UN",
      attributes: { formato: flavor },
      stock: 37,
    })),
  },
  {
    category: "roupas-fitness",
    name: "Camiseta Dry Fit XNutri Preta",
    sku: "XN-ROUPA-DRY-PRETA",
    price: 69.9,
    shortDescription: "Camiseta leve para treino intenso.",
    description:
      "Tecido respirável com toque macio, modelagem atlética e secagem rápida para uso na academia.",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    weightGrams: 250,
    variants: clothingSizes.map((size, index) => ({
      name: size,
      sku: `XN-ROUPA-DRY-PRETA-${index + 1}`,
      attributes: { modelo: size, cor: "Preta" },
      stock: 12 + index,
    })),
  },
  {
    category: "roupas-fitness",
    name: "Regata Treino XNutri Verde",
    sku: "XN-ROUPA-REGATA-VERDE",
    price: 59.9,
    shortDescription: "Regata com mobilidade para musculação.",
    description:
      "Corte confortável para amplitude de movimentos, indicada para treinos de superiores e dias quentes.",
    imageUrl:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 220,
    variants: clothingSizes.map((size, index) => ({
      name: size,
      sku: `XN-ROUPA-REGATA-VERDE-${index + 1}`,
      attributes: { modelo: size, cor: "Verde" },
      stock: 10 + index,
    })),
  },
  {
    category: "roupas-fitness",
    name: "Legging Compression XNutri Feminina",
    sku: "XN-ROUPA-LEGGING-COMP",
    price: 119.9,
    shortDescription: "Legging de compressão com cintura alta.",
    description:
      "Peça firme e confortável para treino funcional, musculação e corrida, com tecido de alta elasticidade.",
    imageUrl:
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1200&q=80",
    bestSeller: true,
    weightGrams: 360,
    variants: clothingSizes.map((size, index) => ({
      name: size,
      sku: `XN-ROUPA-LEGGING-COMP-${index + 1}`,
      attributes: { modelo: size, cor: "Grafite" },
      stock: 8 + index,
    })),
  },
  {
    category: "roupas-fitness",
    name: "Shorts Performance XNutri Masculino",
    sku: "XN-ROUPA-SHORTS-PERF",
    price: 89.9,
    shortDescription: "Shorts leve com bolso e ajuste firme.",
    description:
      "Shorts para musculação, corrida e funcional, com tecido resistente e liberdade de movimento.",
    imageUrl:
      "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 310,
    variants: clothingSizes.map((size, index) => ({
      name: size,
      sku: `XN-ROUPA-SHORTS-PERF-${index + 1}`,
      attributes: { modelo: size, cor: "Preto" },
      stock: 9 + index,
    })),
  },
  {
    category: "suplementos",
    name: "Coqueteleira XNutri 700ml",
    sku: "XN-ACESS-SHAKER-700",
    price: 29.9,
    shortDescription: "Coqueteleira resistente com marcador de volume.",
    description:
      "Shaker com tampa segura e misturador interno para whey, creatina e pré-treinos no dia a dia.",
    imageUrl:
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80",
    promotion: true,
    weightGrams: 180,
    variants: ["Preta", "Transparente"].map((color, index) => ({
      name: color,
      sku: `XN-ACESS-SHAKER-700-${index + 1}`,
      attributes: { cor: color, volume: "700ml" },
      stock: 45 - index * 5,
    })),
  },
  {
    category: "suplementos",
    name: "Strap de Treino XNutri Pro",
    sku: "XN-ACESS-STRAP-PRO",
    price: 39.9,
    shortDescription: "Strap para puxadas, remadas e levantamentos.",
    description:
      "Acessório reforçado para auxiliar pegada em treinos pesados, com costura resistente e bom conforto.",
    imageUrl:
      "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?auto=format&fit=crop&w=1200&q=80",
    weightGrams: 120,
    variants: ["Par único"].map((item) => ({
      name: item,
      sku: "XN-ACESS-STRAP-PRO-PAR",
      attributes: { unidade: item },
      stock: 33,
    })),
  },
];

function slug(value: string) {
  return slugify(value, { lower: true, strict: true, locale: "pt" });
}

async function cleanDatabase() {
  await prisma.cashMovement.deleteMany();
  await prisma.pOSPayment.deleteMany();
  await prisma.pOSSaleItem.deleteMany();
  await prisma.pOSSale.deleteMany();
  await prisma.pOSSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.financialSettings.deleteMany();
  await prisma.storeSetting.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.pickupLocation.deleteMany();
  await prisma.category.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.address.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await cleanDatabase();

  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Administrador XNutri",
      email: "admin@xnutri.com.br",
      passwordHash,
      role: UserRole.ADMIN,
      phone: "(17) 99700-0000",
      adminProfile: {
        create: {
          active: true,
          role: "ADMIN",
          permissions: {
            all: true,
            modules: [
              "dashboard",
              "products",
              "categories",
              "inventory",
              "coupons",
              "orders",
              "customers",
              "reports",
              "finance",
              "content",
              "shipping",
              "settings",
              "audit",
              "pos",
            ],
          },
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      name: "Cliente Demonstração",
      email: "cliente@xnutri.com.br",
      passwordHash: await bcrypt.hash("Cliente@12345", 12),
      role: UserRole.CLIENT,
      phone: "(17) 99600-0000",
      addresses: {
        create: {
          label: "Casa",
          recipient: "Cliente Demonstração",
          zipCode: "15130-000",
          street: "Rua Rui Barbosa",
          number: "100",
          district: "Centro",
          city: "Mirassol",
          state: "SP",
          isDefault: true,
        },
      },
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: "Caixa XNutri",
      email: "caixa@xnutri.com.br",
      passwordHash: await bcrypt.hash("Caixa@12345", 12),
      role: UserRole.ADMIN,
      phone: "(17) 99500-0000",
      adminProfile: {
        create: {
          active: true,
          role: "CASHIER",
          permissions: {
            modules: ["pos"],
          },
        },
      },
    },
  });

  const categories = new Map<string, string>();
  for (const category of categorySeeds) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.key,
        description: category.description,
        imageUrl: category.imageUrl,
        sortOrder: categorySeeds.indexOf(category),
      },
    });
    categories.set(category.key, created.id);
  }

  await prisma.shippingMethod.createMany({
    data: [
      {
        name: "Correios PAC",
        code: "correios-pac",
        provider: "CORREIOS",
        basePrice: 24.9,
        freeAbove: 299,
        deliveryDaysMin: 4,
        deliveryDaysMax: 8,
        settings: { serviceCode: "04510", enabledForCepValidation: true },
      },
      {
        name: "Correios Sedex",
        code: "correios-sedex",
        provider: "CORREIOS",
        basePrice: 39.9,
        freeAbove: 399,
        deliveryDaysMin: 1,
        deliveryDaysMax: 3,
        settings: { serviceCode: "04014", enabledForCepValidation: true },
      },
      {
        name: "Frete Manual Mirassol e Região",
        code: "manual-regional",
        provider: "MANUAL",
        basePrice: 14.9,
        freeAbove: 199,
        deliveryDaysMin: 1,
        deliveryDaysMax: 2,
        settings: { cities: ["Mirassol", "São José do Rio Preto", "Bálsamo"] },
      },
      {
        name: "Retirada na loja",
        code: "retirada-loja",
        provider: "PICKUP",
        basePrice: 0,
        deliveryDaysMin: 0,
        deliveryDaysMax: 1,
        settings: { protocolRequired: true },
      },
    ],
  });

  await prisma.pickupLocation.create({
    data: {
      name: "XNutri Mirassol",
      zipCode: "15130-000",
      street: "Rua 9 de Julho",
      number: "1250",
      district: "Centro",
      city: "Mirassol",
      state: "SP",
      instructions:
        "Retire seu pedido apresentando documento com foto e o protocolo gerado no checkout. Atendimento de segunda a sexta das 9h às 18h e sábado das 9h às 13h.",
    },
  });

  await prisma.coupon.createMany({
    data: [
      {
        code: "BEMVINDO10",
        description: "10% de desconto na primeira compra",
        type: "PERCENTAGE",
        value: 10,
        maxDiscount: 40,
        minSubtotal: 99,
        usageLimit: 500,
        active: true,
      },
      {
        code: "FRETEGRATIS",
        description: "Frete grátis em pedidos acima de R$ 199",
        type: "FREE_SHIPPING",
        value: 0,
        minSubtotal: 199,
        usageLimit: 300,
        active: true,
      },
      {
        code: "XTREINO20",
        description: "R$ 20 de desconto em compras acima de R$ 180",
        type: "FIXED_AMOUNT",
        value: 20,
        minSubtotal: 180,
        usageLimit: 150,
        active: true,
      },
    ],
  });

  await prisma.banner.createMany({
    data: [
      {
        title: "Xnutri Suplementos Nutricionais",
        subtitle: "Suplementos, moda fitness e acessórios selecionados para treinos reais em Mirassol-SP.",
        imageUrl:
          "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=85",
        ctaLabel: "Comprar agora",
        ctaHref: "/catalogo",
        location: "HOME_HERO",
        sortOrder: 1,
      },
      {
        title: "Vitrine fitness Xnutri",
        subtitle: "Compre roupa fitness, suplementos e acessórios online; retire sem frete no Centro de Mirassol.",
        imageUrl:
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=85",
        ctaLabel: "Ver roupas",
        ctaHref: "/catalogo?category=roupas-fitness",
        location: "HOME_PROMO",
        sortOrder: 1,
      },
    ],
  });

  await prisma.storeSetting.createMany({
    data: [
      {
        key: "store",
        description: "Dados públicos da loja",
        value: {
          name: "XNutri",
          legalName: "XNutri Comércio de Suplementos",
          phone: "(17) 99700-0000",
          city: "Mirassol",
          state: "SP",
          address: "Rua 9 de Julho, 1250 - Centro",
          businessHours: "Segunda a sexta das 9h às 18h. Sábado das 9h às 13h.",
          whatsapp: "5517997000000",
          email: "contato@xnutri.com.br",
          instagram: "https://instagram.com/xnutri",
        },
      },
      {
        key: "home",
        description: "Conteudo editavel da home",
        value: {
          heroTitle: "Performance, saúde e estilo em um só lugar.",
          heroSubtitle:
            "Suplementos, moda fitness e acessórios para quem treina de verdade. Compre online e retire na loja em Mirassol.",
          heroPrimaryLabel: "Ver produtos",
          heroPrimaryHref: "/catalogo",
          heroSecondaryLabel: "Retirar na loja",
          heroSecondaryHref: "/retirada-na-loja",
          institutionalText:
            "Suplementos, vitaminas, moda fitness e acessórios com compra online, retirada na loja e suporte próximo em Mirassol-SP.",
          footerText: "Treino, saúde e estilo com atendimento local.",
        },
      },
      {
        key: "checkout",
        description: "Configurações de checkout",
        value: {
          currency: "BRL",
          pickupProtocolPrefix: "XN",
          lowStockThresholdDefault: 5,
          defaultPickupMessage:
            "Retire seu pedido apresentando documento com foto e o protocolo gerado no checkout.",
        },
      },
      {
        key: "delivery",
        description: "Configurações gerais de entrega",
        value: {
          pickupEnabled: true,
          manualShippingEnabled: true,
          correiosEnabled: true,
          freeShippingMinValue: 299,
          estimatedDeliveryText: "Entrega regional em 1 a 2 dias úteis. Correios conforme CEP.",
        },
      },
      {
        key: "payments",
        description: "Informacoes publicas de pagamento",
        value: {
          provider: "Mercado Pago",
          pixEnabled: true,
          creditCardEnabled: true,
          instructions: "Pagamentos sao processados pelo Mercado Pago.",
        },
      },
    ],
  });

  await prisma.financialSettings.create({
    data: {
      name: "default",
      mercadoPagoRate: 4.99,
      fixedTransactionFee: 0,
      posCashRate: 0,
      posPixRate: 0,
      posDebitRate: 1.99,
      posCreditRate: 3.99,
      posMercadoPagoRate: 4.99,
      allowNegativeStock: false,
      estimatedTaxRate: 0,
      defaultPackagingCost: 2.5,
      minimumMargin: 25,
      lowMarginAlert: 12,
      defaultShippingCostPaidByStore: 0,
    },
  });

  let variantBarcodeCounter = 1;

  for (const [productIndex, product] of products.entries()) {
    const categoryId = categories.get(product.category);
    if (!categoryId) {
      throw new Error(`Categoria não encontrada: ${product.category}`);
    }

    const productBarcode = `7891000${String(productIndex + 1).padStart(6, "0")}`;
    const created = await prisma.product.create({
      data: {
        categoryId,
        name: product.name,
        slug: slug(product.name),
        sku: product.sku,
        barcode: productBarcode,
        ean: productBarcode,
        internalCode: `PDV-${product.sku}`,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: Number((product.price * 0.58).toFixed(2)),
        packagingCost: 2.5,
        desiredMargin: 35,
        estimatedTaxRate: 0,
        featured: product.featured ?? false,
        bestSeller: product.bestSeller ?? false,
        promotion: product.promotion ?? false,
        weightGrams: product.weightGrams,
        metaTitle: `${product.name} | XNutri`,
        metaDescription: product.shortDescription,
        images: {
          create: [
            {
              url: product.imageUrl,
              alt: product.name,
              sortOrder: 1,
            },
          ],
        },
      },
    });

    for (const variant of product.variants) {
      const variantBarcode = `7892000${String(variantBarcodeCounter).padStart(6, "0")}`;
      variantBarcodeCounter += 1;
      const createdVariant = await prisma.productVariant.create({
        data: {
          productId: created.id,
          name: variant.name,
          sku: variant.sku,
          barcode: variantBarcode,
          ean: variantBarcode,
          internalCode: `PDV-${variant.sku}`,
          attributes: variant.attributes,
          priceAdjustment: variant.priceAdjustment ?? 0,
          costPrice: variant.costPrice ?? Number(((product.price + (variant.priceAdjustment ?? 0)) * 0.58).toFixed(2)),
          packagingCost: variant.packagingCost ?? 2.5,
        },
      });

      const inventory = await prisma.inventory.create({
        data: {
          productId: created.id,
          variantId: createdVariant.id,
          quantity: variant.stock,
          reserved: 0,
          lowStockThreshold: 5,
          available: variant.stock > 0,
        },
      });

      await prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          createdById: admin.id,
          type: "STOCK_IN",
          quantity: variant.stock,
          reason: "Carga inicial de seed",
          balance: variant.stock,
        },
      });
    }

    await prisma.review.createMany({
      data: [
        {
          productId: created.id,
          rating: 5,
          title: "Entrega rápida e produto aprovado",
          comment: "Comprei pela loja online e o atendimento foi muito bom. Produto chegou bem embalado.",
          approved: true,
        },
        {
          productId: created.id,
          rating: 4,
          title: "Bom custo-benefício",
          comment: "Gostei da qualidade e voltaria a comprar. A retirada na loja ajudou bastante.",
          approved: true,
        },
      ],
    });
  }

  console.log("Seed concluido: admin, caixa, cliente, categorias, fretes, cupons, banners e 25 produtos criados.");
  console.log("Admin: admin@xnutri.com.br / Admin@12345");
  console.log(`Caixa: ${cashier.email} / Caixa@12345`);
  console.log("Cliente: cliente@xnutri.com.br / Cliente@12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
