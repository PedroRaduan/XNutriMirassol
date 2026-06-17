import { MercadoPagoConfig, Payment as MercadoPayment, Preference } from "mercadopago";
import type { Order, OrderItem, Payment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { decrementInventoryForOrder } from "@/lib/ecommerce/inventory";
import { getBaseUrl, toNumber } from "@/lib/utils";

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }

  return new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: 5000,
    },
  });
}

export async function createMercadoPagoPreference(
  order: Order & { items: OrderItem[]; payments: Payment[] },
) {
  const client = getMercadoPagoClient();
  const preference = new Preference(client);
  const baseUrl = getBaseUrl();

  const response = await preference.create({
    body: {
      external_reference: order.orderNumber,
      notification_url: `${baseUrl}/api/payments/mercado-pago/webhook`,
      back_urls: {
        success: `${baseUrl}/pedido/${order.orderNumber}?payment=success`,
        pending: `${baseUrl}/pedido/${order.orderNumber}?payment=pending`,
        failure: `${baseUrl}/pedido/${order.orderNumber}?payment=failure`,
      },
      auto_return: "approved",
      statement_descriptor: "XNUTRI",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        shippingType: order.shippingType,
      },
      payer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: {
          number: order.customerPhone,
        },
      },
      payment_methods: {
        installments: 6,
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
      },
      shipments: {
        cost: toNumber(order.shippingCost),
        mode: order.shippingType === "PICKUP" ? "not_specified" : "custom",
      },
      items: order.items.map((item) => ({
        id: item.sku,
        title: item.productName,
        quantity: item.quantity,
        unit_price: toNumber(item.unitPrice),
        currency_id: "BRL",
      })),
    },
  });

  return response;
}

export async function getMercadoPagoPayment(paymentId: string) {
  const client = getMercadoPagoClient();
  const payment = new MercadoPayment(client);
  return payment.get({ id: paymentId });
}

export function mapMercadoPagoStatus(status?: string | null) {
  if (status === "approved") return "APPROVED";
  if (status === "rejected") return "REJECTED";
  if (status === "refunded") return "REFUNDED";
  if (status === "cancelled" || status === "canceled") return "CANCELED";
  return "PENDING";
}

export function mapMercadoPagoMethod(methodId?: string | null, paymentTypeId?: string | null) {
  if (paymentTypeId === "credit_card") return "CREDIT_CARD";
  if (paymentTypeId === "debit_card") return "DEBIT_CARD";
  if (methodId === "pix" || paymentTypeId === "bank_transfer") return "PIX";
  if (paymentTypeId === "ticket") return "BOLETO";
  return "UNKNOWN";
}

export async function syncMercadoPagoPayment(paymentId: string) {
  const mpPayment = await getMercadoPagoPayment(paymentId);
  const orderNumber = String(mpPayment.external_reference ?? mpPayment.metadata?.orderNumber ?? "");

  if (!orderNumber) {
    throw new Error("Pagamento sem referência de pedido.");
  }

  const status = mapMercadoPagoStatus(mpPayment.status);
  const method = mapMercadoPagoMethod(mpPayment.payment_method_id, mpPayment.payment_type_id);
  const payload = JSON.parse(JSON.stringify(mpPayment)) as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { orderNumber },
      include: { payments: true },
    });

    await tx.payment.upsert({
      where: { externalId: String(mpPayment.id) },
      create: {
        orderId: order.id,
        externalId: String(mpPayment.id),
        method,
        status,
        amount: Number(mpPayment.transaction_amount ?? order.total),
        payload,
      },
      update: {
        method,
        status,
        amount: Number(mpPayment.transaction_amount ?? order.total),
        payload,
      },
    });

    if (status === "APPROVED" && order.status === "PENDING") {
      await decrementInventoryForOrder(tx, order.id);
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: order.shippingType === "PICKUP" ? "AWAITING_PICKUP" : "PAID",
          paidAt: new Date(),
        },
      });
    }

    if (status === "REFUNDED") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
        },
      });
    }

    if (status === "REJECTED" || status === "CANCELED") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
        },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true },
    });
  });
}
