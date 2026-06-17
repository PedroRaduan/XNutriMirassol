export const storefrontCategorySlugs = ["suplementos", "roupas-fitness"];

export const supplementSourceCategorySlugs = [
  "suplementos",
  "whey",
  "creatina",
  "pre-treino",
  "vitaminas",
  "acessorios",
];

export function getStorefrontCategory(category: { slug: string; name: string }) {
  if (category.slug === "roupas-fitness") {
    return { slug: "roupas-fitness", name: "Roupas Fitness" };
  }

  return { slug: "suplementos", name: "Suplementos" };
}

export const fallbackCategories = [
  {
    id: "fallback-suplementos",
    name: "Suplementos",
    slug: "suplementos",
    description: "Whey, creatina, pre-treinos, vitaminas e itens de apoio para performance.",
    imageUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "fallback-roupas",
    name: "Roupas Fitness",
    slug: "roupas-fitness",
    description: "Leggings, camisetas, regatas e shorts com tamanhos PP ao GG.",
    imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
  },
];

export const fallbackProducts = [
  {
    id: "fallback-whey-isolado",
    categoryId: "fallback-suplementos",
    category: fallbackCategories[0],
    name: "Whey Protein Isolado Xnutri 900g",
    slug: "whey-protein-isolado-xnutri-900g",
    sku: "XN-WHEY-ISO-900",
    brand: "XNutri",
    shortDescription: "Whey isolado premium para recuperacao e rotina proteica.",
    description:
      "Produto de exemplo local para visualizacao quando o PostgreSQL ainda nao foi inicializado. Com o banco ativo, o catalogo vem do Prisma e do seed real.",
    price: 169.9,
    compareAtPrice: 189.9,
    status: "ACTIVE",
    featured: true,
    bestSeller: true,
    promotion: true,
    weightGrams: 1050,
    widthCm: 16,
    heightCm: 22,
    lengthCm: 16,
    images: [
      {
        id: "fallback-whey-image",
        url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80",
        alt: "Whey Protein Isolado Xnutri 900g",
        sortOrder: 1,
      },
    ],
    variants: [
      { id: "fallback-whey-chocolate", name: "Chocolate", sku: "XN-WHEY-ISO-CHOC", attributes: { sabor: "Chocolate" }, priceAdjustment: 0, inventory: { quantity: 20, reserved: 0 } },
      { id: "fallback-whey-baunilha", name: "Baunilha", sku: "XN-WHEY-ISO-BAU", attributes: { sabor: "Baunilha" }, priceAdjustment: 0, inventory: { quantity: 18, reserved: 0 } },
    ],
    inventory: [{ quantity: 38, reserved: 0 }],
    reviews: [],
  },
  {
    id: "fallback-creatina",
    categoryId: "fallback-suplementos",
    category: fallbackCategories[0],
    name: "Creatina Monohidratada Xnutri 300g",
    slug: "creatina-monohidratada-xnutri-300g",
    sku: "XN-CREA-MONO-300",
    brand: "XNutri",
    shortDescription: "Creatina pura para forca, potencia e desempenho.",
    description: "Creatina monohidratada sem sabor com estrutura de estoque por variacao.",
    price: 89.9,
    compareAtPrice: 99.9,
    status: "ACTIVE",
    featured: true,
    bestSeller: true,
    promotion: true,
    weightGrams: 420,
    widthCm: 12,
    heightCm: 16,
    lengthCm: 12,
    images: [
      {
        id: "fallback-creatina-image",
        url: "https://images.unsplash.com/photo-1596357395217-80de13130e92?auto=format&fit=crop&w=1200&q=80",
        alt: "Creatina Monohidratada Xnutri 300g",
        sortOrder: 1,
      },
    ],
    variants: [
      { id: "fallback-creatina-ss", name: "Sem sabor", sku: "XN-CREA-MONO-SS", attributes: { sabor: "Sem sabor" }, priceAdjustment: 0, inventory: { quantity: 42, reserved: 0 } },
    ],
    inventory: [{ quantity: 42, reserved: 0 }],
    reviews: [],
  },
  {
    id: "fallback-legging",
    categoryId: "fallback-roupas",
    category: fallbackCategories[1],
    name: "Legging Compression Xnutri Feminina",
    slug: "legging-compression-xnutri-feminina",
    sku: "XN-ROUPA-LEGGING-COMP",
    brand: "XNutri",
    shortDescription: "Legging de compressao com cintura alta e tamanhos PP ao GG.",
    description: "Peca fitness para treino funcional, musculacao e corrida, com variacoes reais de tamanho.",
    price: 119.9,
    compareAtPrice: null,
    status: "ACTIVE",
    featured: true,
    bestSeller: true,
    promotion: false,
    weightGrams: 360,
    widthCm: 25,
    heightCm: 4,
    lengthCm: 32,
    images: [
      {
        id: "fallback-legging-image",
        url: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1200&q=80",
        alt: "Legging Compression Xnutri Feminina",
        sortOrder: 1,
      },
    ],
    variants: ["PP", "P", "M", "G", "GG"].map((size, index) => ({
      id: `fallback-legging-${size}`,
      name: size,
      sku: `XN-ROUPA-LEGGING-${size}`,
      attributes: { tamanho: size, cor: "Grafite" },
      priceAdjustment: 0,
      inventory: { quantity: 8 + index, reserved: 0 },
    })),
    inventory: [{ quantity: 50, reserved: 0 }],
    reviews: [],
  },
  {
    id: "fallback-camiseta",
    categoryId: "fallback-roupas",
    category: fallbackCategories[1],
    name: "Camiseta Dry Fit Xnutri Preta",
    slug: "camiseta-dry-fit-xnutri-preta",
    sku: "XN-ROUPA-DRY-PRETA",
    brand: "XNutri",
    shortDescription: "Camiseta leve para treino intenso, com tamanhos PP ao GG.",
    description: "Tecido respiravel, modelagem atletica e secagem rapida para academia.",
    price: 69.9,
    compareAtPrice: null,
    status: "ACTIVE",
    featured: true,
    bestSeller: false,
    promotion: false,
    weightGrams: 250,
    widthCm: 22,
    heightCm: 3,
    lengthCm: 30,
    images: [
      {
        id: "fallback-camiseta-image",
        url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
        alt: "Camiseta Dry Fit Xnutri Preta",
        sortOrder: 1,
      },
    ],
    variants: ["PP", "P", "M", "G", "GG"].map((size, index) => ({
      id: `fallback-camiseta-${size}`,
      name: size,
      sku: `XN-ROUPA-DRY-${size}`,
      attributes: { tamanho: size, cor: "Preta" },
      priceAdjustment: 0,
      inventory: { quantity: 10 + index, reserved: 0 },
    })),
    inventory: [{ quantity: 60, reserved: 0 }],
    reviews: [],
  },
];

export const fallbackHero = {
  title: "Xnutri Suplementos Nutricionais",
  subtitle:
    "Suplementos, roupas fitness com tamanhos e acessorios para treinos reais em Mirassol-SP.",
  imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=85",
  ctaLabel: "Comprar agora",
  ctaHref: "/catalogo",
};

export const fallbackPickup = {
  id: "fallback-pickup",
  name: "XNutri Mirassol",
  zipCode: "15130-000",
  street: "Rua 9 de Julho",
  number: "1250",
  complement: null,
  district: "Centro",
  city: "Mirassol",
  state: "SP",
  instructions:
    "Retire seu pedido apresentando documento com foto e o protocolo gerado no checkout. Atendimento de segunda a sexta das 9h as 18h e sabado das 9h as 13h.",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
