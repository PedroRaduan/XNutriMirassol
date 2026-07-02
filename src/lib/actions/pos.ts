"use server";

import type { POSPaymentMethod, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePOS } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getFinancialSettings } from "@/lib/finance/settings";
import { marginPercent, roundMoney } from "@/lib/finance/calculations";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { toNumber } from "@/lib/utils";
import { optionalDocumentSchema } from "@/lib/validations";

export type POSActionState = {
  ok: boolean;
  message: string;
  saleNumber?: string;
  receiptUrl?: string;
};

const initialFailure = { ok: false, message: "Não foi possível concluir a ação." };

function posErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "Error" && error.message.length <= 220) {
    return error.message;
  }
  return initialFailure.message;
}

const paymentMethods = ["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "MERCADO_PAGO"] as const;
const moneySchema = z.coerce.number().finite().min(0).max(1_000_000_000);

const openSessionSchema = z.object({
  openingAmount: moneySchema,
  notes: z.string().max(500).optional(),
});

const closeSessionSchema = z.object({
  sessionId: z.string().min(1),
  closingAmount: moneySchema,
  notes: z.string().max(500).optional(),
});

const cashMovementSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: moneySchema.refine((value) => value > 0, "Informe um valor maior que zero"),
  reason: z.string().trim().min(3).max(240),
});

const posSaleSchema = z.object({
  sessionId: z.string().min(1),
  customerId: z.string().optional(),
  customer: z
    .object({
      name: z.string().max(120).optional(),
      phone: z.string().max(20).optional(),
      document: optionalDocumentSchema,
      email: z.string().email().max(254).optional().or(z.literal("")),
    })
    .optional(),
  generalDiscount: moneySchema.default(0),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.coerce.number().int().min(1).max(999),
        discount: moneySchema.default(0),
      }),
    )
    .min(1)
    .max(100),
  payments: z
    .array(
      z.object({
        method: z.enum(paymentMethods),
        amount: moneySchema.refine((value) => value >= 0.01, "Pagamento precisa ser maior que zero"),
        amountReceived: moneySchema.optional(),
        externalReference: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(10),
});

const cancelSaleSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().min(4).max(240),
});

const returnItemSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  reason: z.string().min(4).max(240),
});

function generatePOSSaleNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `PDV${date}${nanoid(6).toUpperCase()}`;
}

function rateForMethod(method: POSPaymentMethod, settings: Awaited<ReturnType<typeof getFinancialSettings>>) {
  const rates: Record<POSPaymentMethod, number> = {
    CASH: settings.posCashRate,
    PIX: settings.posPixRate,
    DEBIT_CARD: settings.posDebitRate,
    CREDIT_CARD: settings.posCreditRate,
    MERCADO_PAGO: settings.posMercadoPagoRate,
  };

  return rates[method] ?? 0;
}

function cashDelta(type: "OPENING" | "SALE" | "CASH_IN" | "CASH_OUT" | "REFUND" | "CLOSING" | "ADJUSTMENT", amount: number) {
  if (type === "CASH_OUT" || type === "REFUND") return amount * -1;
  if (type === "CLOSING") return 0;
  return amount;
}

async function auditPOS(
  tx: Prisma.TransactionClient,
  adminUserId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
) {
  const ipAddress = await getClientIp();
  await tx.auditLog.create({
    data: { adminUserId, action, entity, entityId, metadata, ipAddress },
  });
}

async function assertSessionForUser(tx: Prisma.TransactionClient, sessionId: string, userId: string, role: string) {
  const session = await tx.pOSSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "OPEN") {
    throw new Error("Abra o caixa antes de vender.");
  }

  if (role === "CASHIER" && session.openedById !== userId) {
    throw new Error("Este caixa pertence a outro usuario.");
  }

  return session;
}

export async function openPOSSession(_: POSActionState, formData: FormData): Promise<POSActionState> {
  await assertSameOrigin();
  const admin = await requirePOS(true);
  const parsed = openSessionSchema.safeParse({
    openingAmount: formData.get("openingAmount") ?? 0,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Abertura inválida." };
  const openingAmount = parsed.data.openingAmount;
  const notes = sanitizeOptionalText(parsed.data.notes);

  try {
    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.pOSSession.findFirst({
        where: { openedById: admin.id, status: "OPEN" },
        select: { id: true },
      });

      if (existing) throw new Error("Voce ja tem um caixa aberto.");

      const created = await tx.pOSSession.create({
        data: {
          openedById: admin.id,
          openingAmount,
          expectedAmount: openingAmount,
          notes,
        },
      });

      await tx.cashMovement.create({
        data: {
          sessionId: created.id,
          type: "OPENING",
          amount: openingAmount,
          reason: "Abertura de caixa",
          createdById: admin.id,
        },
      });

      await auditPOS(tx, admin.admin.id, "pos.session.open", "pos_sessions", created.id, {
        openingAmount,
      });

      return created;
    });

    revalidatePath("/pdv");
    return { ok: true, message: "Caixa aberto.", saleNumber: session.id };
  } catch (error) {
    return { ...initialFailure, message: posErrorMessage(error) };
  }
}

export async function closePOSSession(_: POSActionState, formData: FormData): Promise<POSActionState> {
  await assertSameOrigin();
  const admin = await requirePOS(true);
  const parsed = closeSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    closingAmount: formData.get("closingAmount") ?? 0,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Fechamento inválido." };
  const { sessionId, closingAmount } = parsed.data;
  const notes = sanitizeOptionalText(parsed.data.notes);

  try {
    await prisma.$transaction(async (tx) => {
      await assertSessionForUser(tx, sessionId, admin.id, admin.adminRole);

      const movements = await tx.cashMovement.findMany({ where: { sessionId } });
      const expectedAmount = roundMoney(
        movements.reduce((sum, movement) => sum + cashDelta(movement.type, toNumber(movement.amount)), 0),
      );
      const difference = roundMoney(closingAmount - expectedAmount);

      await tx.pOSSession.update({
        where: { id: sessionId },
        data: {
          status: "CLOSED",
          closedById: admin.id,
          closingAmount,
          expectedAmount,
          difference,
          notes,
          closedAt: new Date(),
        },
      });

      await tx.cashMovement.create({
        data: {
          sessionId,
          type: "CLOSING",
          amount: closingAmount,
          reason: "Fechamento de caixa",
          createdById: admin.id,
        },
      });

      await auditPOS(tx, admin.admin.id, "pos.session.close", "pos_sessions", sessionId, {
        closingAmount,
        expectedAmount,
        difference,
      });
    });

    revalidatePath("/pdv");
    revalidatePath("/pdv/relatorios");
    return { ok: true, message: "Caixa fechado." };
  } catch (error) {
    return { ...initialFailure, message: posErrorMessage(error) };
  }
}

export async function createCashMovement(_: POSActionState, formData: FormData): Promise<POSActionState> {
  await assertSameOrigin();
  const admin = await requirePOS(true);
  const parsed = cashMovementSchema.safeParse({
    sessionId: formData.get("sessionId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Movimentação inválida." };
  const { sessionId, type, amount } = parsed.data;
  const reason = sanitizeText(parsed.data.reason);

  try {
    await prisma.$transaction(async (tx) => {
      await assertSessionForUser(tx, sessionId, admin.id, admin.adminRole);
      await tx.cashMovement.create({
        data: {
          sessionId,
          type,
          amount,
          reason,
          createdById: admin.id,
        },
      });
      await tx.pOSSession.update({
        where: { id: sessionId },
        data: { expectedAmount: { increment: cashDelta(type, amount) } },
      });
      await auditPOS(tx, admin.admin.id, type === "CASH_OUT" ? "pos.cash.withdraw" : "pos.cash.add", "cash_movements", sessionId, {
        amount,
        reason,
      });
    });

    revalidatePath("/pdv");
    return { ok: true, message: type === "CASH_OUT" ? "Sangria registrada." : "Reforco registrado." };
  } catch (error) {
    return { ...initialFailure, message: posErrorMessage(error) };
  }
}

export async function finalizePOSSale(input: unknown): Promise<POSActionState> {
  await assertSameOrigin();
  const admin = await requirePOS(true);
  const parsed = posSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Venda invalida." };
  }

  const payload = parsed.data;
  const settings = await getFinancialSettings();

  try {
    const result = await prisma.$transaction(async (tx) => {
      await assertSessionForUser(tx, payload.sessionId, admin.id, admin.adminRole);

      const customerId = await resolvePOSCustomer(tx, payload.customerId, payload.customer);
      const saleLines = [];

      for (const item of payload.items) {
        const line = await resolveSaleLine(tx, item, settings.allowNegativeStock);
        saleLines.push(line);
      }

      const subtotal = roundMoney(saleLines.reduce((sum, item) => sum + item.subtotal, 0));
      const itemDiscountTotal = roundMoney(saleLines.reduce((sum, item) => sum + item.itemDiscount, 0));
      const generalDiscount = roundMoney(Math.min(payload.generalDiscount, Math.max(subtotal - itemDiscountTotal, 0)));
      const discountTotal = roundMoney(itemDiscountTotal + generalDiscount);
      const total = roundMoney(subtotal - discountTotal);

      const configuredCashierLimit = Number(process.env.PDV_CASHIER_MAX_DISCOUNT_PERCENT ?? 10);
      const cashierDiscountLimit = Number.isFinite(configuredCashierLimit)
        ? Math.min(Math.max(configuredCashierLimit, 0), 100)
        : 10;
      const discountPercent = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;
      if (admin.adminRole === "CASHIER" && discountPercent > cashierDiscountLimit + 0.001) {
        throw new Error(`O desconto máximo permitido para caixa é ${cashierDiscountLimit.toLocaleString("pt-BR")}% da venda.`);
      }

      if (total <= 0) throw new Error("Total da venda precisa ser maior que zero.");

      const paymentsInputTotal = roundMoney(payload.payments.reduce((sum, payment) => sum + payment.amount, 0));
      if (Math.abs(paymentsInputTotal - total) > 0.01) {
        throw new Error("A soma dos pagamentos precisa bater com o total da venda.");
      }

      const hasNonCashPayment = payload.payments.some((payment) => payment.method !== "CASH");
      let fixedFeePending = hasNonCashPayment ? settings.fixedTransactionFee : 0;
      let feeTotal = 0;
      let amountReceived = 0;
      let changeAmount = 0;

      const paymentRows = payload.payments.map((payment) => {
        const method = payment.method as POSPaymentMethod;
        const variableFee = roundMoney(payment.amount * (rateForMethod(method, settings) / 100));
        const fixedFee = method !== "CASH" && fixedFeePending > 0 ? fixedFeePending : 0;
        fixedFeePending = fixedFee > 0 ? 0 : fixedFeePending;
        const fee = roundMoney(variableFee + fixedFee);

        const received = method === "CASH" ? roundMoney(payment.amountReceived ?? payment.amount) : payment.amount;
        const change = method === "CASH" ? roundMoney(Math.max(received - payment.amount, 0)) : 0;
        if (method === "CASH" && received + 0.01 < payment.amount) {
          throw new Error("Valor recebido em dinheiro menor que o valor em dinheiro da venda.");
        }

        feeTotal = roundMoney(feeTotal + fee);
        amountReceived = roundMoney(amountReceived + received);
        changeAmount = roundMoney(changeAmount + change);

        return {
          method,
          amount: payment.amount,
          fee,
          amountReceived: method === "CASH" ? received : null,
          changeAmount: method === "CASH" ? change : null,
          externalReference: sanitizeOptionalText(payment.externalReference),
        };
      });

      const costTotal = roundMoney(saleLines.reduce((sum, item) => sum + item.costTotal, 0));
      const packagingCost = roundMoney(saleLines.reduce((sum, item) => sum + item.packagingTotal, 0));
      const estimatedTax = roundMoney(total * (settings.estimatedTaxRate / 100));
      const grossProfit = roundMoney(total - costTotal);
      const netProfit = roundMoney(grossProfit - feeTotal - packagingCost - estimatedTax);
      const margin = marginPercent(netProfit, total);
      const saleNumber = generatePOSSaleNumber();

      const itemRows: Prisma.POSSaleItemUncheckedCreateWithoutSaleInput[] = saleLines.map((item) => {
        const revenueShare = total > 0 ? item.lineTotalBeforeGlobal / Math.max(subtotal - itemDiscountTotal, 0.01) : 0;
        const globalAllocated = roundMoney(generalDiscount * revenueShare);
        const totalAfterDiscount = roundMoney(item.lineTotalBeforeGlobal - globalAllocated);
        const feeAllocated = roundMoney(feeTotal * (totalAfterDiscount / total));
        const taxAllocated = roundMoney(estimatedTax * (totalAfterDiscount / total));
        const gross = roundMoney(totalAfterDiscount - item.costTotal);
        const net = roundMoney(gross - item.packagingTotal - feeAllocated - taxAllocated);

        return {
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          productNameSnapshot: item.productName,
          skuSnapshot: item.sku,
          barcodeSnapshot: item.barcode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          unitPackagingCost: item.unitPackagingCost,
          discount: roundMoney(item.itemDiscount + globalAllocated),
          subtotal: item.subtotal,
          total: totalAfterDiscount,
          grossProfit: gross,
          netProfit: net,
          margin: marginPercent(net, totalAfterDiscount),
          attributes: item.attributes ?? undefined,
        };
      });

      const sale = await tx.pOSSale.create({
        data: {
          saleNumber,
          receiptToken: nanoid(24),
          customerId,
          cashierId: admin.id,
          sessionId: payload.sessionId,
          subtotal,
          discountTotal,
          total,
          amountReceived,
          changeAmount,
          costTotal,
          feeTotal,
          packagingCost,
          estimatedTax,
          grossProfit,
          netProfit,
          margin,
          notes: sanitizeOptionalText(payload.notes),
          items: { create: itemRows },
          payments: { create: paymentRows },
        },
      });

      for (const item of saleLines) {
        if (item.allowNegativeStock) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { quantity: { decrement: item.quantity } },
          });
        } else {
          const decremented = await tx.inventory.updateMany({
            where: {
              id: item.inventoryId,
              quantity: { gte: item.quantity + item.reservedBefore },
            },
            data: { quantity: { decrement: item.quantity } },
          });

          if (decremented.count !== 1) {
            throw new Error(`Estoque insuficiente para ${item.productName}. Atualize a busca e tente novamente.`);
          }
        }

        const updated = await tx.inventory.findUniqueOrThrow({ where: { id: item.inventoryId } });
        const available = updated.quantity - updated.reserved > 0;
        if (updated.available !== available) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { available },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            inventoryId: item.inventoryId,
            posSaleId: sale.id,
            createdById: admin.id,
            type: "STOCK_OUT",
            quantity: item.quantity * -1,
            reason: `Venda presencial ${sale.saleNumber}`,
            balance: updated.quantity,
            metadata: {
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
            },
          },
        });
      }

      const cashAmount = roundMoney(paymentRows.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + payment.amount, 0));
      if (cashAmount > 0) {
        await tx.cashMovement.create({
          data: {
            sessionId: payload.sessionId,
            saleId: sale.id,
            type: "SALE",
            amount: cashAmount,
            reason: `Venda ${sale.saleNumber}`,
            createdById: admin.id,
          },
        });
        await tx.pOSSession.update({
          where: { id: payload.sessionId },
          data: { expectedAmount: { increment: cashAmount } },
        });
      }

      await auditPOS(tx, admin.admin.id, "pos.sale.complete", "pos_sales", sale.id, {
        saleNumber: sale.saleNumber,
        total,
        payments: paymentRows.map((payment) => payment.method),
      });

      return sale;
    });

    revalidatePath("/pdv");
    revalidatePath("/pdv/relatorios");
    revalidatePath("/admin");
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin/estoque");
    revalidatePath("/catalogo");

    return {
      ok: true,
      message: "Venda finalizada.",
      saleNumber: result.saleNumber,
      receiptUrl: `/pdv/comprovante/${result.saleNumber}`,
    };
  } catch (error) {
    return { ...initialFailure, message: posErrorMessage(error) };
  }
}

async function resolvePOSCustomer(
  tx: Prisma.TransactionClient,
  customerId?: string,
  customer?: z.infer<typeof posSaleSchema>["customer"],
) {
  if (customerId) {
    const existing = await tx.user.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!existing) throw new Error("Cliente informado não existe.");
    return existing.id;
  }

  const name = sanitizeOptionalText(customer?.name);
  const phone = sanitizeOptionalText(customer?.phone);
  const document = sanitizeOptionalText(customer?.document);
  const email = sanitizeOptionalText(customer?.email);
  if (!name && !phone && !document && !email) return null;

  if (email) {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return existing.id;
  }

  const created = await tx.user.create({
    data: {
      name: name ?? "Cliente PDV",
      email: email ?? `pdv-${Date.now()}-${nanoid(6).toLowerCase()}@xnutri.local`,
      phone,
      document,
      role: "CLIENT",
    },
  });

  return created.id;
}

async function resolveSaleLine(
  tx: Prisma.TransactionClient,
  item: z.infer<typeof posSaleSchema>["items"][number],
  allowNegativeStock: boolean,
) {
  const variant = item.variantId
    ? await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: {
          inventory: true,
          product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
        },
      })
    : null;

  const productRecord = !variant
    ? await tx.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      })
    : null;
  const product = variant?.product ?? productRecord;

  if (!product || product.status !== "ACTIVE") {
    throw new Error("Produto indisponível para venda.");
  }

  if (variant && (!variant.active || variant.productId !== product.id)) {
    throw new Error(`Variação indisponível para ${product.name}.`);
  }

  const inventory = variant?.inventory ?? productRecord?.inventory.find((entry) => entry.variantId === null) ?? productRecord?.inventory[0] ?? null;
  if (!inventory) throw new Error(`Estoque não cadastrado para ${product.name}.`);

  const available = inventory.quantity - inventory.reserved;
  if (!allowNegativeStock && available < item.quantity) {
    throw new Error(`Estoque insuficiente para ${product.name}${variant ? ` - ${variant.name}` : ""}. Disponível: ${Math.max(available, 0)}.`);
  }

  const unitPrice = roundMoney(toNumber(product.price) + toNumber(variant?.priceAdjustment ?? 0));
  const subtotal = roundMoney(unitPrice * item.quantity);
  const itemDiscount = roundMoney(Math.min(item.discount, subtotal));
  const lineTotalBeforeGlobal = roundMoney(subtotal - itemDiscount);
  const unitCost = roundMoney(toNumber(variant?.costPrice ?? product.costPrice ?? 0));
  const unitPackagingCost = roundMoney(toNumber(variant?.packagingCost ?? product.packagingCost ?? 0));

  return {
    inventoryId: inventory.id,
    stockBefore: inventory.quantity,
    reservedBefore: inventory.reserved,
    allowNegativeStock,
    productId: product.id,
    variantId: variant?.id ?? null,
    productName: variant ? `${product.name} - ${variant.name}` : product.name,
    sku: variant?.sku ?? product.sku,
    barcode: variant?.barcode ?? variant?.ean ?? product.barcode ?? product.ean ?? product.internalCode ?? null,
    quantity: item.quantity,
    unitPrice,
    subtotal,
    itemDiscount,
    lineTotalBeforeGlobal,
    unitCost,
    unitPackagingCost,
    costTotal: roundMoney(unitCost * item.quantity),
    packagingTotal: roundMoney(unitPackagingCost * item.quantity),
    attributes: (variant?.attributes ?? null) as Prisma.InputJsonValue | null,
  };
}

export async function cancelPOSSale(input: unknown): Promise<POSActionState> {
  await assertSameOrigin();
  const admin = await requirePOS(true);
  const parsed = cancelSaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Cancelamento inválido." };

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.pOSSale.findUnique({
        where: { id: parsed.data.saleId },
        include: { items: true, payments: true, session: true },
      });
      if (!sale) throw new Error("Venda não encontrada.");
      if (admin.adminRole === "CASHIER" && sale.cashierId !== admin.id) {
        throw new Error("Você só pode cancelar suas próprias vendas.");
      }
      if (sale.status === "CANCELED" || sale.status === "REFUNDED") {
        throw new Error("Esta venda já foi cancelada ou devolvida.");
      }

      await tx.pOSSale.update({
        where: { id: sale.id },
        data: {
          status: "CANCELED",
          paymentStatus: "CANCELED",
          cancellationReason: sanitizeText(parsed.data.reason),
          canceledAt: new Date(),
        },
      });

      for (const item of sale.items) {
        const quantityToReturn = Math.max(item.quantity - item.returnedQuantity, 0);
        if (quantityToReturn <= 0) continue;

        const inventory = await tx.inventory.findFirst({
          where: item.variantId ? { variantId: item.variantId } : { productId: item.productId, variantId: null },
        });
        if (!inventory) continue;

        const updated = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { increment: quantityToReturn },
            available: true,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            posSaleId: sale.id,
            createdById: admin.id,
            type: "RETURN",
            quantity: quantityToReturn,
            reason: `Cancelamento da venda ${sale.saleNumber}: ${sanitizeText(parsed.data.reason)}`,
            balance: updated.quantity,
          },
        });

        await tx.pOSSaleItem.update({
          where: { id: item.id },
          data: { returnedQuantity: item.quantity },
        });
      }

      const paymentTotal = roundMoney(sale.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0));
      const cashPaid = roundMoney(sale.payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + toNumber(payment.amount), 0));
      const cashRefund = paymentTotal > 0 ? roundMoney(toNumber(sale.total) * (cashPaid / paymentTotal)) : 0;
      if (cashRefund > 0 && sale.session.status === "OPEN") {
        await tx.cashMovement.create({
          data: {
            sessionId: sale.sessionId,
            saleId: sale.id,
            type: "REFUND",
            amount: cashRefund,
            reason: `Cancelamento ${sale.saleNumber}`,
            createdById: admin.id,
          },
        });
        await tx.pOSSession.update({
          where: { id: sale.sessionId },
          data: { expectedAmount: { decrement: cashRefund } },
        });
      }

      await auditPOS(tx, admin.admin.id, "pos.sale.cancel", "pos_sales", sale.id, {
        saleNumber: sale.saleNumber,
        reason: parsed.data.reason,
      });
    });

    revalidatePath("/pdv");
    revalidatePath("/pdv/relatorios");
    revalidatePath("/admin/estoque");
    revalidatePath("/catalogo");
    return { ok: true, message: "Venda cancelada e estoque estornado." };
  } catch (error) {
    return { ...initialFailure, message: posErrorMessage(error) };
  }
}

export async function cancelPOSSaleFromForm(formData: FormData) {
  const result = await cancelPOSSale({
    saleId: String(formData.get("saleId") ?? ""),
    reason: String(formData.get("reason") ?? "Cancelamento pelo PDV"),
  });

  if (!result.ok) {
    throw new Error(result.message);
  }
}

export async function returnPOSSaleItemFromForm(formData: FormData) {
  await assertSameOrigin();
  const admin = await requirePOS(true);
  const parsed = returnItemSchema.safeParse({
    saleItemId: String(formData.get("saleItemId") ?? ""),
    quantity: formData.get("quantity"),
    reason: String(formData.get("reason") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Devolução inválida.");
  }

  await prisma.$transaction(async (tx) => {
    const item = await tx.pOSSaleItem.findUnique({
      where: { id: parsed.data.saleItemId },
      include: { sale: { include: { items: true, payments: true, session: true } } },
    });

    if (!item) throw new Error("Item da venda não encontrado.");
    if (admin.adminRole === "CASHIER" && item.sale.cashierId !== admin.id) {
      throw new Error("Você só pode devolver itens das suas próprias vendas.");
    }
    if (item.sale.status === "CANCELED" || item.sale.status === "REFUNDED") {
      throw new Error("Esta venda não aceita nova devolução.");
    }

    const remaining = item.quantity - item.returnedQuantity;
    if (parsed.data.quantity > remaining) {
      throw new Error(`Quantidade máxima para devolver: ${remaining}.`);
    }

    const unitTotal = toNumber(item.total) / item.quantity;
    const unitGross = toNumber(item.grossProfit) / item.quantity;
    const unitNet = toNumber(item.netProfit) / item.quantity;
    const refundTotal = roundMoney(unitTotal * parsed.data.quantity);
    const grossToReverse = roundMoney(unitGross * parsed.data.quantity);
    const netToReverse = roundMoney(unitNet * parsed.data.quantity);
    const costToReverse = roundMoney(toNumber(item.unitCost) * parsed.data.quantity);
    const packagingToReverse = roundMoney(toNumber(item.unitPackagingCost) * parsed.data.quantity);

    const inventory = await tx.inventory.findFirst({
      where: item.variantId ? { variantId: item.variantId } : { productId: item.productId, variantId: null },
    });

    if (inventory) {
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { increment: parsed.data.quantity },
          available: true,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          posSaleId: item.saleId,
          createdById: admin.id,
          type: "RETURN",
          quantity: parsed.data.quantity,
          reason: `Devolucao parcial ${item.sale.saleNumber}: ${sanitizeText(parsed.data.reason)}`,
          balance: updated.quantity,
        },
      });
    }

    await tx.pOSSaleItem.update({
      where: { id: item.id },
      data: { returnedQuantity: { increment: parsed.data.quantity } },
    });

    const allReturned = item.sale.items.every((saleItem) => {
      const returned = saleItem.id === item.id ? saleItem.returnedQuantity + parsed.data.quantity : saleItem.returnedQuantity;
      return returned >= saleItem.quantity;
    });
    const newTotal = roundMoney(Math.max(toNumber(item.sale.total) - refundTotal, 0));
    const newGross = roundMoney(toNumber(item.sale.grossProfit) - grossToReverse);
    const newNet = roundMoney(toNumber(item.sale.netProfit) - netToReverse);

    await tx.pOSSale.update({
      where: { id: item.saleId },
      data: {
        total: newTotal,
        costTotal: roundMoney(Math.max(toNumber(item.sale.costTotal) - costToReverse, 0)),
        packagingCost: roundMoney(Math.max(toNumber(item.sale.packagingCost) - packagingToReverse, 0)),
        grossProfit: newGross,
        netProfit: newNet,
        margin: marginPercent(newNet, newTotal),
        status: allReturned ? "REFUNDED" : "PARTIALLY_REFUNDED",
        paymentStatus: allReturned ? "REFUNDED" : item.sale.paymentStatus,
      },
    });

    const cashPaid = item.sale.payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const cashRefund = toNumber(item.sale.total) > 0 ? roundMoney(refundTotal * (cashPaid / toNumber(item.sale.total))) : 0;
    if (cashRefund > 0 && item.sale.session.status === "OPEN") {
      await tx.cashMovement.create({
        data: {
          sessionId: item.sale.sessionId,
          saleId: item.saleId,
          type: "REFUND",
          amount: cashRefund,
          reason: `Devolucao ${item.sale.saleNumber}`,
          createdById: admin.id,
        },
      });
      await tx.pOSSession.update({
        where: { id: item.sale.sessionId },
        data: { expectedAmount: { decrement: cashRefund } },
      });
    }

    await auditPOS(tx, admin.admin.id, "pos.sale.return", "pos_sale_items", item.id, {
      saleNumber: item.sale.saleNumber,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
    });
  });

  revalidatePath("/pdv");
  revalidatePath("/pdv/relatorios");
  revalidatePath("/admin/estoque");
  revalidatePath("/catalogo");
}
