import { cookies } from "next/headers";
import { fallbackPickup, fallbackProducts } from "@/lib/fallback/catalog";
import { generateOrderNumber } from "@/lib/utils";

const DEMO_CART_COOKIE = "xnutri_demo_cart";
const DEMO_ORDERS_COOKIE = "xnutri_demo_orders";

type DemoCartCookie = {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
  shippingCost?: number;
  shippingMethodId?: string;
  pickupLocationId?: string;
  shippingZipCode?: string;
};

export type DemoCheckoutData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingType: "DELIVERY" | "PICKUP";
  paymentMethod: "PIX" | "CREDIT_CARD";
};

export type DemoOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "PENDING";
  shippingType: "DELIVERY" | "PICKUP";
  pickupProtocol: string | null;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments: Array<{
    id: string;
    method: "PIX" | "CREDIT_CARD";
    status: "PENDING";
    amount: number;
    checkoutUrl: string | null;
    createdAt: string;
  }>;
  pickupLocation: typeof fallbackPickup | null;
  shippingMethod: { id: string; name: string } | null;
};

const fallbackCoupons = [
  { code: "BEMVINDO10", type: "PERCENTAGE", value: 10, minSubtotal: 99, maxDiscount: 40 },
  { code: "FRETEGRATIS", type: "FREE_SHIPPING", value: 0, minSubtotal: 199 },
  { code: "XTREINO20", type: "FIXED_AMOUNT", value: 20, minSubtotal: 180 },
] as const;

async function readJsonCookie<T>(name: string, fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(name)?.value;
  if (!raw) return fallback;

  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonCookie(name: string, value: unknown) {
  const cookieStore = await cookies();
  cookieStore.set(name, encodeURIComponent(JSON.stringify(value)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

function emptyDemoCart(): DemoCartCookie {
  return { items: [], shippingCost: 0, pickupLocationId: fallbackPickup.id };
}

async function readDemoCart() {
  return readJsonCookie<DemoCartCookie>(DEMO_CART_COOKIE, emptyDemoCart());
}

async function writeDemoCart(cart: DemoCartCookie) {
  await writeJsonCookie(DEMO_CART_COOKIE, cart);
}

function findFallbackProduct(productId: string) {
  return fallbackProducts.find((product) => product.id === productId);
}

function getFallbackVariantStock(productId: string, variantId?: string) {
  const product = findFallbackProduct(productId);
  const variant = product?.variants.find((candidate) => candidate.id === variantId) ?? product?.variants[0];

  return {
    product,
    selectedVariantId: variant?.id,
    availableStock: variant?.inventory?.quantity ?? 0,
  };
}

function assertDemoStock(productId: string, variantId: string | undefined, quantity: number) {
  const { availableStock } = getFallbackVariantStock(productId, variantId);

  if (quantity > availableStock) {
    throw new Error(`Estoque insuficiente. Disponivel: ${availableStock} unidade(s).`);
  }
}

function demoDiscount(code: string | undefined, subtotal: number, shippingCost: number) {
  const coupon = fallbackCoupons.find((item) => item.code === code);
  if (!coupon || subtotal < coupon.minSubtotal) return 0;

  if (coupon.type === "FREE_SHIPPING") return shippingCost;
  if (coupon.type === "FIXED_AMOUNT") return Math.min(coupon.value, subtotal);

  return Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount, subtotal);
}

export async function getDemoCartForDisplay() {
  const cart = await readDemoCart();
  const items = cart.items.flatMap((item) => {
    const product = findFallbackProduct(item.productId);
    if (!product) return [];

    const variant = product.variants.find((candidate) => candidate.id === item.variantId) ?? product.variants[0];
    const unitPrice = Number(product.price) + Number(variant?.priceAdjustment ?? 0);
    const quantity = Math.max(1, Math.min(item.quantity, 99));

    return {
      id: `${item.productId}:${variant?.id ?? "padrao"}`,
      productId: product.id,
      categoryId: product.categoryId,
      variantId: variant?.id,
      name: product.name,
      slug: product.slug,
      sku: variant?.sku ?? product.sku,
      imageUrl: product.images[0]?.url,
      variantName: variant?.name,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
      availableStock: variant?.inventory?.quantity ?? 99,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const shippingCost = cart.pickupLocationId ? 0 : Number(cart.shippingCost ?? 0);
  const discount = demoDiscount(cart.couponCode, subtotal, shippingCost);

  return {
    id: "demo-cart",
    items,
    coupon: cart.couponCode ? { code: cart.couponCode } : null,
    shippingMethod: cart.shippingMethodId ? { id: cart.shippingMethodId, name: "Frete Manual Mirassol e Regiao" } : null,
    pickupLocation: cart.pickupLocationId ? fallbackPickup : null,
    shippingZipCode: cart.shippingZipCode ?? null,
    subtotal,
    shippingCost,
    discount,
    total: Math.max(subtotal + shippingCost - discount, 0),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function addDemoCartItem(productId: string, variantId: string | undefined, quantity: number) {
  const { product, selectedVariantId, availableStock } = getFallbackVariantStock(productId, variantId);
  if (!product) {
    throw new Error("Produto demo nao encontrado.");
  }

  const cart = await readDemoCart();
  const existing = cart.items.find((item) => item.productId === productId && item.variantId === selectedVariantId);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (nextQuantity > availableStock) {
    throw new Error(`Estoque insuficiente. Disponivel: ${availableStock} unidade(s).`);
  }

  if (existing) {
    existing.quantity = Math.min(nextQuantity, 99);
  } else {
    cart.items.push({ productId, variantId: selectedVariantId, quantity });
  }

  await writeDemoCart(cart);
}

export async function updateDemoCartItem(itemId: string, quantity: number) {
  const cart = await readDemoCart();
  const current = cart.items.find((item) => `${item.productId}:${item.variantId ?? "padrao"}` === itemId);

  if (current && quantity > 0) {
    assertDemoStock(current.productId, current.variantId, Math.min(quantity, 99));
  }

  cart.items = cart.items
    .map((item) => {
      const id = `${item.productId}:${item.variantId ?? "padrao"}`;
      return id === itemId ? { ...item, quantity: Math.min(quantity, 99) } : item;
    })
    .filter((item) => item.quantity > 0);
  await writeDemoCart(cart);
}

export async function removeDemoCartItem(itemId: string) {
  const cart = await readDemoCart();
  cart.items = cart.items.filter((item) => `${item.productId}:${item.variantId ?? "padrao"}` !== itemId);
  await writeDemoCart(cart);
}

export async function applyDemoCoupon(code: string) {
  const normalized = code.trim().toUpperCase();
  const cart = await readDemoCart();
  const display = await getDemoCartForDisplay();
  const coupon = fallbackCoupons.find((item) => item.code === normalized);

  if (!coupon) return { ok: false, message: "Cupom demo nao encontrado." };
  if (display.subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      message: `Este cupom exige subtotal minimo de ${coupon.minSubtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    };
  }
  if (coupon.type === "FREE_SHIPPING" && display.shippingCost <= 0) {
    return { ok: false, message: "Escolha uma entrega paga antes de aplicar frete gratis." };
  }

  cart.couponCode = normalized;
  await writeDemoCart(cart);
  return { ok: true, message: "Cupom aplicado no modo demo." };
}

export async function clearDemoCoupon() {
  const cart = await readDemoCart();
  delete cart.couponCode;
  await writeDemoCart(cart);
}

export async function selectDemoShipping(zipCode: string, methodId: string, price: number) {
  const cart = await readDemoCart();
  cart.shippingZipCode = zipCode;
  cart.shippingMethodId = methodId;
  cart.shippingCost = price;
  delete cart.pickupLocationId;
  await writeDemoCart(cart);
}

export async function selectDemoPickup(pickupLocationId = fallbackPickup.id) {
  const cart = await readDemoCart();
  cart.pickupLocationId = pickupLocationId;
  cart.shippingCost = 0;
  delete cart.shippingMethodId;
  await writeDemoCart(cart);
}

async function readDemoOrders() {
  return readJsonCookie<DemoOrder[]>(DEMO_ORDERS_COOKIE, []);
}

async function writeDemoOrders(orders: DemoOrder[]) {
  await writeJsonCookie(DEMO_ORDERS_COOKIE, orders.slice(0, 5));
}

export async function createDemoOrder(data: DemoCheckoutData) {
  const cart = await getDemoCartForDisplay();
  if (!cart.id || cart.items.length === 0) throw new Error("Carrinho vazio.");

  for (const item of cart.items) {
    if (item.quantity > item.availableStock) {
      throw new Error(`Estoque insuficiente para ${item.name}. Disponivel: ${item.availableStock} unidade(s).`);
    }
  }

  const now = new Date();
  const order: DemoOrder = {
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(),
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    status: "PENDING",
    shippingType: data.shippingType,
    pickupProtocol: data.shippingType === "PICKUP" ? `XN-DEMO-${crypto.randomUUID().slice(0, 6).toUpperCase()}` : null,
    subtotal: cart.subtotal,
    discount: cart.discount,
    shippingCost: data.shippingType === "PICKUP" ? 0 : cart.shippingCost,
    total: data.shippingType === "PICKUP" ? Math.max(cart.subtotal - cart.discount, 0) : cart.total,
    createdAt: now.toISOString(),
    items: cart.items.map((item) => ({
      id: item.id,
      productName: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    payments: [
      {
        id: crypto.randomUUID(),
        method: data.paymentMethod,
        status: "PENDING",
        amount: cart.total,
        checkoutUrl: null,
        createdAt: now.toISOString(),
      },
    ],
    pickupLocation: data.shippingType === "PICKUP" ? fallbackPickup : null,
    shippingMethod: data.shippingType === "DELIVERY" ? { id: cart.shippingMethod?.id ?? "fallback-manual", name: cart.shippingMethod?.name ?? "Frete Manual Mirassol e Regiao" } : null,
  };

  const orders = await readDemoOrders();
  await writeDemoOrders([order, ...orders]);
  await writeDemoCart(emptyDemoCart());
  return order;
}

export async function getDemoOrder(orderNumber: string) {
  const orders = await readDemoOrders();
  return orders.find((order) => order.orderNumber === orderNumber) ?? null;
}

export async function getDemoOrders() {
  return readDemoOrders();
}
