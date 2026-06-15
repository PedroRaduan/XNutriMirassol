import { z } from "zod";

const required = "Campo obrigatório";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(8, "Informe pelo menos 8 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo"),
  email: z.string().email("E-mail inválido").toLowerCase(),
  phone: z.string().min(10, "Telefone inválido"),
  password: z.string().min(8, "Use pelo menos 8 caracteres"),
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
  code: z.string().min(3).max(32).toUpperCase(),
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
  sku: z.string().min(3, required),
  shortDescription: z.string().min(10, required),
  description: z.string().min(20, required),
  price: z.coerce.number().positive("Preço inválido"),
  compareAtPrice: z.coerce.number().optional(),
  imageUrl: z.string().url("URL de imagem inválida"),
  featured: z.coerce.boolean().optional(),
  bestSeller: z.coerce.boolean().optional(),
  promotion: z.coerce.boolean().optional(),
  stock: z.coerce.number().int().min(0),
});

export const categoryAdminSchema = z.object({
  name: z.string().min(2, required),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const couponAdminSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minSubtotal: z.coerce.number().optional(),
  usageLimit: z.coerce.number().int().optional(),
  active: z.coerce.boolean().optional(),
});

export const bannerAdminSchema = z.object({
  title: z.string().min(3, required),
  subtitle: z.string().optional(),
  imageUrl: z.string().url("URL inválida"),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  location: z.enum(["HOME_HERO", "HOME_PROMO", "CATALOG"]),
  active: z.coerce.boolean().optional(),
});

export const newsletterSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  name: z.string().optional(),
});
