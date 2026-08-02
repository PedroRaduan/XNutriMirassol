import "server-only";

import type { Order, OrderItem, Payment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { decrementInventoryForOrder, releaseInventoryReservationForOrder, restoreInventoryForOrder } from "@/lib/ecommerce/inventory";
import { getBaseUrl, toNumber } from "@/lib/utils";
import { getPagBankCheckoutUrl, mapPagBankMethod, mapPagBankStatus } from "@/lib/payments/pagbank-mappers";

export { getPagBankCheckoutUrl, mapPagBankMethod, mapPagBankStatus } from "@/lib/payments/pagbank-mappers";
export { validatePagBankWebhookSignature } from "@/lib/payments/pagbank-signature";

type PagBankLink = { rel?: string; href?: string; method?: string };
type PagBankCheckout = { id?: string; links?: PagBankLink[]; status?: string };
type PagBankCharge = {
  id?: string;
  status?: string;
  created_at?: string;
  paid_at?: string;
  amount?: { value?: number; currency?: string; summary?: { paid?: number; refunded?: number } };
  payment_method?: { type?: string };
};
type PagBankWebhook = {
  id?: string;
  reference_id?: string;
  status?: string;
  charges?: PagBankCharge[];
};

function getPagBankToken() {
  const token = process.env.PAGBANK_TOKEN?.trim();
  if (!token) throw new Error("PAGBANK_TOKEN não configurada.");
  return token;
}

function getPagBankBaseUrl() {
  return (process.env.PAGBANK_ENVIRONMENT ?? "sandbox") === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function parsePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55/, "");
  if (!/^\d{11}$/.test(digits)) return null;
  return { country: "+55", area: digits.slice(0, 2), number: digits.slice(2) };
}

function getCustomer(order: Order) {
  const document = order.document?.replace(/\D/g, "") ?? "";
  const phone = parsePhone(order.customerPhone);
  const hasFullName = order.customerName.trim().split(/\s+/).length >= 2;

  if (!hasFullName || !phone || !/^\d{11}$/.test(document)) return undefined;
  return {
    name: order.customerName.trim().slice(0, 120),
    email: order.customerEmail.trim().slice(0, 60),
    tax_id: document,
    phone,
  };
}

async function pagBankRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`${getPagBankBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getPagBankToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  const payload = await response.json().catch(() => null) as T | { error_messages?: Array<{ description?: string }> } | null;
  if (!response.ok) {
  const message = payload && typeof payload === "object" && "error_messages" in payload
    ? payload.error_messages?.[0]?.description
    : undefined;
    throw new Error(message ? `PagBank recusou o checkout: ${message}` : `PagBank recusou o checkout (${response.status}).`);
  }
  return payload as T;
}

export async function createPagBankCheckout(
  order: Order & { items: OrderItem[]; payments: Payment[] },
  accessToken: string,
) {
  const total = toNumber(order.total);
  if (total <= 0) throw new Error("O total do pedido precisa ser maior que zero para pagamento online.");

  const baseUrl = getBaseUrl();
  const callbackUrl = `${baseUrl}/api/payments/pagbank/webhook`;
  const orderUrl = `${baseUrl}/pedido/${order.orderNumber}?access=${encodeURIComponent(accessToken)}`;
  const selectedMethod = order.payments.find((payment) => payment.provider === "PAGBANK")?.method ?? "PIX";
  const paymentMethod = selectedMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX";
  const checkout = await pagBankRequest<PagBankCheckout>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      reference_id: order.orderNumber,
      customer: getCustomer(order),
      customer_modifiable: true,
      items: order.items.map((item) => ({
        reference_id: item.sku.slice(0, 100),
        name: item.productName.slice(0, 100),
        description: `Pedido ${order.orderNumber}`.slice(0, 255),
        quantity: item.quantity,
        unit_amount: toCents(toNumber(item.unitPrice)),
        ...(item.imageUrl?.startsWith("https://") ? { image_url: item.imageUrl } : {}),
      })),
      additional_amount: toCents(toNumber(order.shippingCost)),
      discount_amount: toCents(toNumber(order.discount)),
      payment_methods: [{ type: paymentMethod }],
      ...(paymentMethod === "CREDIT_CARD" ? {
        payment_methods_configs: [{
          type: "CREDIT_CARD",
          config_options: [{ option: "INSTALLMENTS_LIMIT", value: "6" }],
        }],
      } : {}),
      soft_descriptor: "XNUTRI",
      redirect_url: `${orderUrl}?payment=return`,
      return_url: orderUrl,
      notification_urls: [callbackUrl],
      payment_notification_urls: [callbackUrl],
    }),
  });

  const checkoutUrl = getPagBankCheckoutUrl(checkout);
  if (!checkout.id || !checkoutUrl) throw new Error("A resposta do PagBank não trouxe o link de pagamento.");
  return { checkoutId: checkout.id, checkoutUrl };
}

function getCharge(payload: PagBankWebhook) {
  if (String(payload.id ?? "").startsWith("CHAR_")) return payload as PagBankCharge & PagBankWebhook;
  return payload.charges?.[0] ?? null;
}

export async function syncPagBankWebhook(payload: PagBankWebhook) {
  const orderNumber = String(payload.reference_id ?? "");
  if (!/^XN[A-Z0-9]+$/.test(orderNumber)) throw new Error("Notificação sem referência de pedido válida.");

  const charge = getCharge(payload);
  const status = mapPagBankStatus(charge?.status ?? payload.status);
  const externalId = String(charge?.id ?? payload.id ?? "");

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { orderNumber },
      include: { payments: true },
    });
    const payment = await tx.payment.findFirst({
      where: { orderId: order.id, provider: "PAGBANK" },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) throw new Error("Pagamento PagBank não encontrado para este pedido.");

    const amountInCents = Number(charge?.amount?.value);
    const amount = Number.isFinite(amountInCents) ? amountInCents / 100 : toNumber(order.total);
    const expectedAmount = toNumber(order.total);
    const currency = String(charge?.amount?.currency ?? "BRL").toUpperCase();

    if (charge && (!Number.isFinite(amountInCents) || Math.abs(amount - expectedAmount) > 0.01)) {
      throw new Error("O valor confirmado pelo PagBank não corresponde ao pedido.");
    }
    if (currency !== "BRL") throw new Error("A moeda confirmada pelo PagBank não corresponde ao pedido.");

    const safePayload = {
      checkoutId: payload.id?.startsWith("CHEC_") ? payload.id : payment.preferenceId,
      chargeId: externalId || null,
      status: charge?.status ?? payload.status ?? null,
      amountInCents: Number.isFinite(amountInCents) ? amountInCents : null,
      currency,
      paidAt: charge?.paid_at ?? null,
    } satisfies Prisma.InputJsonObject;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        ...(externalId.startsWith("CHAR_") ? { externalId } : {}),
        method: mapPagBankMethod(charge?.payment_method?.type),
        status,
        amount,
        payload: safePayload,
      },
    });

    if (status === "APPROVED") {
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: order.shippingType === "PICKUP" ? "AWAITING_PICKUP" : "PAID",
          paidAt: new Date(),
        },
      });
      if (updated.count === 1) await decrementInventoryForOrder(tx, order.id);
    }

    if ((status === "REFUNDED" || status === "CANCELED") && ["PAID", "AWAITING_PICKUP"].includes(order.status)) {
      await restoreInventoryForOrder(
        tx,
        order.id,
        status === "REFUNDED" ? `Estorno automático do pedido ${order.orderNumber}` : `Cancelamento automático do pedido ${order.orderNumber}`,
      );
      await tx.order.update({
        where: { id: order.id },
        data: { status: status === "REFUNDED" ? "REFUNDED" : "CANCELED", canceledAt: status === "CANCELED" ? new Date() : undefined },
      });
    } else if (status === "CANCELED" && order.status === "PENDING") {
      await releaseInventoryReservationForOrder(tx, order.id, `Pagamento cancelado para o pedido ${order.orderNumber}`);
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELED", canceledAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        action: "payment.pagbank.webhook.processed",
        entity: "orders",
        entityId: order.id,
        metadata: { externalId: externalId || null, status, amount, currency },
      },
    });

    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
  });
}
