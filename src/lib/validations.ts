import { z } from "zod";

const required = "Campo obrigatório";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function hasValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function hasValidCnpj(value: string) {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calculateDigit = (length: 12 | 13) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = cnpj
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

function hasValidDocument(value?: string) {
  if (!value?.trim()) return true;
  const digits = digitsOnly(value);
  return digits.length === 11 ? hasValidCpf(digits) : digits.length === 14 && hasValidCnpj(digits);
}

function isSafeImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export const optionalDocumentSchema = z
  .string()
  .trim()
  .max(18, "CPF/CNPJ inválido")
  .optional()
  .refine(hasValidDocument, "CPF/CNPJ inválido");

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}, z.coerce.number().min(0).optional());

const optionalInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}, z.coerce.number().int().min(0).optional());

const optionalDateString = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}, z.string().optional());

const optionalCode = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return String(value).trim();
}, z.string().min(3).max(64).optional());

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(8, "Informe pelo menos 8 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().email("E-mail inválido").toLowerCase(),
  phone: z.string().min(10, "Telefone inválido").max(20, "Telefone inválido"),
  password: z
    .string()
    .min(8, "Use pelo menos 8 caracteres")
    .max(128, "A senha é muito longa")
    .regex(/[A-Za-zÀ-ÿ]/, "Inclua ao menos uma letra")
    .regex(/\d/, "Inclua ao menos um número")
    .regex(/[^A-Za-zÀ-ÿ\d]/, "Inclua ao menos um caractere especial"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  phone: z.string().trim().max(20, "Telefone inválido").optional(),
  document: optionalDocumentSchema,
});

export const passwordRecoverySchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
});

export const addressSchema = z.object({
  label: z.string().min(2, required),
  recipient: z.string().min(3, required),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().min(2, required),
  number: z.string().min(1, required),
  complement: z.string().optional(),
  district: z.string().min(2, required),
  city: z.string().min(2, required),
  state: z.string().length(2, "UF inválida").toUpperCase(),
  reference: z.string().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32).toUpperCase(),
});

export const shippingQuoteSchema = z.object({
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  subtotal: z.coerce.number().min(0),
});

export const checkoutSchema = z
  .object({
    customerName: z.string().min(3, required),
    customerEmail: z.string().email("E-mail inválido").toLowerCase(),
    customerPhone: z.string().min(10, "Telefone inválido"),
    document: optionalDocumentSchema,
    shippingType: z.enum(["DELIVERY", "PICKUP"]),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD"]),
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    shippingMethodId: z.string().optional(),
    pickupLocationId: z.string().optional(),
    notes: z.string().max(1000, "Observações muito longas").optional(),
    privacyConsent: z.boolean().refine(Boolean, "Confirme a política de privacidade para continuar"),
  })
  .superRefine((data, ctx) => {
    if (data.shippingType === "DELIVERY") {
      for (const field of ["zipCode", "street", "number", "district", "city", "state", "shippingMethodId"] as const) {
        if (!data[field]) {
          ctx.addIssue({ code: "custom", path: [field], message: required });
        }
      }
    }

    if (data.shippingType === "PICKUP" && !data.pickupLocationId) {
      ctx.addIssue({ code: "custom", path: ["pickupLocationId"], message: required });
    }
  });

export const productAdminSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, required),
  name: z.string().min(3, required),
  slug: z.string().min(3).optional(),
  sku: z.string().min(3, required),
  barcode: optionalCode,
  ean: optionalCode,
  internalCode: optionalCode,
  shortDescription: z.string().min(10, required),
  description: z.string().min(20, required),
  price: z.coerce.number().min(0, "Preço inválido"),
  compareAtPrice: optionalNumber,
  costPrice: optionalNumber,
  packagingCost: optionalNumber,
  desiredMargin: optionalNumber,
  estimatedTaxRate: optionalNumber,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  imageUrls: z.string().min(1, "Informe ao menos uma imagem").max(8000, "Muitas imagens informadas"),
  featured: z.coerce.boolean().optional(),
  bestSeller: z.coerce.boolean().optional(),
  promotion: z.coerce.boolean().optional(),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: optionalInt,
  weightGrams: z.coerce.number().int().min(0),
  widthCm: z.coerce.number().int().min(0),
  heightCm: z.coerce.number().int().min(0),
  lengthCm: z.coerce.number().int().min(0),
}).superRefine((data, ctx) => {
  const urls = data.imageUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  if (urls.length > 10) {
    ctx.addIssue({ code: "custom", path: ["imageUrls"], message: "Use no máximo 10 imagens" });
  }
  if (urls.some((url) => !isSafeImageUrl(url))) {
    ctx.addIssue({ code: "custom", path: ["imageUrls"], message: "Use apenas URLs HTTPS válidas para imagens" });
  }
});

export const productVariantAdminSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, required),
  name: z.string().min(2, required),
  sku: z.string().min(3, required),
  barcode: optionalCode,
  ean: optionalCode,
  internalCode: optionalCode,
  attributes: z.string().min(2, "Informe os atributos"),
  priceAdjustment: optionalNumber,
  costPrice: optionalNumber,
  packagingCost: optionalNumber,
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: optionalInt,
  active: z.coerce.boolean().optional(),
});

export const categoryAdminSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, required),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  active: z.coerce.boolean().optional(),
  sortOrder: optionalInt,
});

export const couponAdminSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, hífen ou sublinhado").toUpperCase(),
  description: z.string().max(240).optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minSubtotal: optionalNumber,
  maxDiscount: optionalNumber,
  startsAt: optionalDateString,
  endsAt: optionalDateString,
  usageLimit: optionalInt,
  productIds: z.string().optional(),
  categoryIds: z.string().optional(),
  active: z.coerce.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.type === "PERCENTAGE" && data.value > 100) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "O desconto percentual não pode passar de 100%" });
  }
  if (data.startsAt && data.endsAt && new Date(data.endsAt) < new Date(data.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "A data final deve ser posterior à data inicial" });
  }
});

export const bannerAdminSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, required),
  subtitle: z.string().optional(),
  imageUrl: z.string().url("URL inválida"),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  location: z.enum(["HOME_HERO", "HOME_PROMO", "CATALOG"]),
  sortOrder: optionalInt,
  startsAt: optionalDateString,
  endsAt: optionalDateString,
  active: z.coerce.boolean().optional(),
});

export const orderAdminSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]),
  notes: z.string().optional(),
});

export const shippingMethodAdminSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, required),
  code: z.string().min(3, required),
  provider: z.enum(["CORREIOS", "MANUAL", "PICKUP"]),
  active: z.coerce.boolean().optional(),
  basePrice: z.coerce.number().min(0),
  freeAbove: optionalNumber,
  deliveryDaysMin: z.coerce.number().int().min(0),
  deliveryDaysMax: z.coerce.number().int().min(0),
  settings: z.string().max(4000).optional(),
}).superRefine((data, ctx) => {
  if (data.deliveryDaysMax < data.deliveryDaysMin) {
    ctx.addIssue({ code: "custom", path: ["deliveryDaysMax"], message: "O prazo máximo deve ser maior ou igual ao mínimo" });
  }
});

export const pickupLocationAdminSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, required),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().min(2, required),
  number: z.string().min(1, required),
  complement: z.string().optional(),
  district: z.string().min(2, required),
  city: z.string().min(2, required),
  state: z.string().length(2, "UF inválida").toUpperCase(),
  instructions: z.string().min(10, required),
  active: z.coerce.boolean().optional(),
});

export const financialSettingsAdminSchema = z.object({
  mercadoPagoRate: z.coerce.number().min(0).max(100),
  fixedTransactionFee: z.coerce.number().min(0),
  posCashRate: z.coerce.number().min(0).max(100),
  posPixRate: z.coerce.number().min(0).max(100),
  posDebitRate: z.coerce.number().min(0).max(100),
  posCreditRate: z.coerce.number().min(0).max(100),
  posMercadoPagoRate: z.coerce.number().min(0).max(100),
  allowNegativeStock: z.coerce.boolean().optional(),
  estimatedTaxRate: z.coerce.number().min(0).max(100),
  defaultPackagingCost: z.coerce.number().min(0),
  minimumMargin: z.coerce.number().min(0).max(1000),
  lowMarginAlert: z.coerce.number().min(0).max(1000),
  defaultShippingCostPaidByStore: z.coerce.number().min(0),
});

export const inventoryAdjustmentSchema = z.object({
  inventoryId: z.string().min(1, "Estoque não encontrado"),
  quantity: z.coerce.number().int().min(0, "Estoque não pode ser negativo").max(10_000_000),
  lowStockThreshold: optionalInt,
  reason: z.string().trim().min(4, "Informe o motivo do ajuste").max(240),
});

export const storeSettingsAdminSchema = z.object({
  storeName: z.string().min(2, required),
  legalName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido"),
  address: z.string().optional(),
  city: z.string().min(2, required),
  state: z.string().length(2, "UF inválida").toUpperCase(),
  businessHours: z.string().optional(),
  instagram: z.string().optional(),
  paymentInfo: z.string().optional(),
  deliveryInfo: z.string().optional(),
  pickupMessage: z.string().optional(),
});

export const homeContentAdminSchema = z.object({
  heroTitle: z.string().min(3, required),
  heroSubtitle: z.string().min(3, required),
  heroPrimaryLabel: z.string().min(2, required),
  heroPrimaryHref: z.string().min(1, required),
  heroSecondaryLabel: z.string().min(2, required),
  heroSecondaryHref: z.string().min(1, required),
  institutionalText: z.string().optional(),
  footerText: z.string().optional(),
});

export const newsletterSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  name: z.string().optional(),
});
