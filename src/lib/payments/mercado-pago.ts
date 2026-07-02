import { MercadoPagoConfig, Payment as MercadoPayment, Preference } from "mercadopago";
import type { Order, OrderItem, Payment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { decrementInventoryForOrder, restoreInventoryForOrder } from "@/lib/ecommerce/inventory";
import { getBaseUrl, toNumber } from "@/lib/utils";
import { getMercadoPagoCheckoutUrl, mapMercadoPagoMethod, mapMercadoPagoStatus } from "@/lib/payments/mercado-pago-mappers";

export { getMercadoPagoCheckoutUrl, mapMercadoPagoMethod, mapMercadoPagoStatus } from "@/lib/payments/mercado-pago-mappers";

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
  const orderTotal = toNumber(order.total);

  if (orderTotal <= 0) {
    throw new Error("O total do pedido precisa ser maior que zero para pagamento online.");
  }

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
        cost: 0,
        mode: order.shippingType === "PICKUP" ? "not_specified" : "custom",
      },
      items: [{
        id: order.orderNumber,
        title: `Pedido XNutri (${order.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns))`,
        quantity: 1,
        unit_price: orderTotal,
        currency_id: "BRL",
      }],
    },
  });

  return response;
}

export async function getMercadoPagoPayment(paymentId: string) {
  const client = getMercadoPagoClient();
  const payment = new MercadoPayment(client);
  return payment.get({ id: paymentId });
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

    const paidAmount = Number(mpPayment.transaction_amount);
    const expectedAmount = toNumber(order.total);
    const currency = String(mpPayment.currency_id ?? "").toUpperCase();
    const metadataOrderId = String(mpPayment.metadata?.orderId ?? mpPayment.metadata?.order_id ?? "");

    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
      throw new Error("O valor confirmado pelo Mercado Pago não corresponde ao total do pedido.");
    }
    if (currency && currency !== "BRL") {
      throw new Error("A moeda confirmada pelo Mercado Pago não corresponde ao pedido.");
    }
    if (metadataOrderId && metadataOrderId !== order.id) {
      throw new Error("A referência interna do pagamento não corresponde ao pedido.");
    }

    await tx.payment.upsert({
      where: { externalId: String(mpPayment.id) },
      create: {
        orderId: order.id,
        externalId: String(mpPayment.id),
        method,
        status,
        amount: paidAmount,
        payload,
      },
      update: {
        method,
        status,
        amount: paidAmount,
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

    if (status === "REFUNDED" || status === "CANCELED") {
      await restoreInventoryForOrder(
        tx,
        order.id,
        status === "REFUNDED"
          ? `Estorno automático do pedido ${order.orderNumber}`
          : `Cancelamento automático do pedido ${order.orderNumber}`,
      );
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: status === "REFUNDED" ? "REFUNDED" : "CANCELED",
          canceledAt: status === "CANCELED" ? new Date() : undefined,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: "payment.webhook.processed",
        entity: "orders",
        entityId: order.id,
        metadata: {
          paymentId: String(mpPayment.id),
          status,
          method,
          amount: paidAmount,
          currency: currency || "BRL",
        },
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true },
    });
  });
}
