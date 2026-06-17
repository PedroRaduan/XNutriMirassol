import { z } from "zod";

const required = "Campo obrigatorio";

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

export const loginSchema = z.object({
  email: z.string().email("E-mail invalido").toLowerCase(),
  password: z.string().min(8, "Informe pelo menos 8 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo"),
  email: z.string().email("E-mail invalido").toLowerCase(),
  phone: z.string().min(10, "Telefone invalido"),
  password: z.string().min(8, "Use pelo menos 8 caracteres"),
});

export const passwordRecoverySchema = z.object({
  email: z.string().email("E-mail invalido").toLowerCase(),
});

export const addressSchema = z.object({
  label: z.string().min(2, required),
  recipient: z.string().min(3, required),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP invalido"),
  street: z.string().min(2, required),
  number: z.string().min(1, required),
  complement: z.string().optional(),
  district: z.string().min(2, required),
  city: z.string().min(2, required),
  state: z.string().length(2, "UF invalida").toUpperCase(),
  reference: z.string().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(32).toUpperCase(),
});

export const shippingQuoteSchema = z.object({
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP invalido"),
  subtotal: z.coerce.number().min(0),
});

export const checkoutSchema = z
  .object({
    customerName: z.string().min(3, required),
    customerEmail: z.string().email("E-mail invalido").toLowerCase(),
    customerPhone: z.string().min(10, "Telefone invalido"),
    document: z.string().optional(),
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
    notes: z.string().optional(),
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
  shortDescription: z.string().min(10, required),
  description: z.string().min(20, required),
  price: z.coerce.number().min(0, "Preco invalido"),
  compareAtPrice: optionalNumber,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  imageUrls: z.string().min(1, "Informe ao menos uma imagem"),
  featured: z.coerce.boolean().optional(),
  bestSeller: z.coerce.boolean().optional(),
  promotion: z.coerce.boolean().optional(),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: optionalInt,
  weightGrams: z.coerce.number().int().min(0),
  widthCm: z.coerce.number().int().min(0),
  heightCm: z.coerce.number().int().min(0),
  lengthCm: z.coerce.number().int().min(0),
});

export const productVariantAdminSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, required),
  name: z.string().min(2, required),
  sku: z.string().min(3, required),
  attributes: z.string().min(2, "Informe os atributos"),
  priceAdjustment: optionalNumber,
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: optionalInt,
  active: z.coerce.boolean().optional(),
});

export const categoryAdminSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, required),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url("URL invalida").optional().or(z.literal("")),
  active: z.coerce.boolean().optional(),
  sortOrder: optionalInt,
});

export const couponAdminSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3).toUpperCase(),
  description: z.string().optional(),
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
});

export const bannerAdminSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, required),
  subtitle: z.string().optional(),
  imageUrl: z.string().url("URL invalida"),
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
  settings: z.string().optional(),
});

export const pickupLocationAdminSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, required),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP invalido"),
  street: z.string().min(2, required),
  number: z.string().min(1, required),
  complement: z.string().optional(),
  district: z.string().min(2, required),
  city: z.string().min(2, required),
  state: z.string().length(2, "UF invalida").toUpperCase(),
  instructions: z.string().min(10, required),
  active: z.coerce.boolean().optional(),
});

export const storeSettingsAdminSchema = z.object({
  storeName: z.string().min(2, required),
  legalName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail invalido"),
  address: z.string().optional(),
  city: z.string().min(2, required),
  state: z.string().length(2, "UF invalida").toUpperCase(),
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
  email: z.string().email("E-mail invalido").toLowerCase(),
  name: z.string().optional(),
});
