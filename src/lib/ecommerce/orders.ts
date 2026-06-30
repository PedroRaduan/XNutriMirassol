import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CART_COOKIE, getCartForDisplay } from "@/lib/ecommerce/cart";
import { calculateDiscount } from "@/lib/ecommerce/coupons";
import { createDemoOrder } from "@/lib/ecommerce/demo-cart";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable, isDemoModeAllowed } from "@/lib/db/errors";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber, toNumber } from "@/lib/utils";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { createMercadoPagoPreference, getMercadoPagoCheckoutUrl } from "@/lib/payments/mercado-pago";
import { marginPercent, roundMoney } from "@/lib/finance/calculations";
import { getFinancialSettings } from "@/lib/finance/settings";
import { validateAddressAgainstCep, validateCep } from "@/lib/shipping/cep";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

type DeliveryAddress = {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export async function createOrderFromCheckout(formData: FormData) {
  const user = await getCurrentUser();
  const cart = await getCartForDisplay();
  const financialSettings = await getFinancialSettings();

  if (!cart.id || cart.items.length === 0) {
    throw new Error("Carrinho vazio.");
  }

  const parsed = checkoutSchema.safeParse({
    customerName: formString(formData, "customerName"),
    customerEmail: formString(formData, "customerEmail"),
    customerPhone: formString(formData, "customerPhone"),
    document: optionalFormValue(formData, "document"),
    shippingType: formString(formData, "shippingType"),
    paymentMethod: formString(formData, "paymentMethod"),
    zipCode: optionalFormValue(formData, "zipCode"),
    street: optionalFormValue(formData, "street"),
    number: optionalFormValue(formData, "number"),
    complement: optionalFormValue(formData, "complement"),
    district: optionalFormValue(formData, "district"),
    city: optionalFormValue(formData, "city"),
    state: optionalFormValue(formData, "state"),
    shippingMethodId: optionalFormValue(formData, "shippingMethodId"),
    pickupLocationId: optionalFormValue(formData, "pickupLocationId"),
    notes: optionalFormValue(formData, "notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados de checkout inválidos.");
  }

  const data = parsed.data;
  let deliveryAddress: DeliveryAddress | null = null;

  if (data.shippingType === "DELIVERY") {
    const submittedCep = validateCep(data.zipCode ?? "");
    const quotedCep = validateCep(cart.shippingZipCode ?? "");

    if (!submittedCep) {
      throw new Error("CEP inválido. Informe os 8 números do CEP.");
    }

    if (!data.shippingMethodId || !cart.shippingMethod?.id) {
      throw new Error("Calcule e selecione uma opção de frete no checkout antes de finalizar com entrega.");
    }

    if (data.shippingMethodId !== cart.shippingMethod.id) {
      throw new Error("O frete selecionado mudou. Selecione a opção novamente no checkout e tente finalizar.");
    }

    if (quotedCep && submittedCep !== quotedCep) {
      throw new Error("O CEP mudou depois do cálculo. Recalcule e selecione o frete novamente para este endereço.");
    }

    const addressValidation = await validateAddressAgainstCep({
      zipCode: data.zipCode,
      street: data.street,
      district: data.district,
      city: data.city,
      state: data.state,
    });

    if (!addressValidation.ok) {
      throw new Error(addressValidation.message);
    }

    deliveryAddress = {
      zipCode: addressValidation.address.zipCode || data.zipCode || "",
      street: addressValidation.address.street || data.street || "",
      number: data.number || "",
      complement: data.complement,
      district: addressValidation.address.district || data.district || "",
      city: addressValidation.address.city || data.city || "",
      state: addressValidation.address.state || data.state || "",
    };
  }

  if (cart.id === "demo-cart") {
    const demoOrder = await createDemoOrder({
      customerName: sanitizeText(data.customerName),
      customerEmail: data.customerEmail,
      customerPhone: sanitizeText(data.customerPhone),
      shippingType: data.shippingType,
      paymentMethod: data.paymentMethod,
    });
    redirect(`/pedido/${demoOrder.orderNumber}`);
  }

  const orderNumber = generateOrderNumber();
  const pickupProtocol =
    data.shippingType === "PICKUP" ? `XN-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null;

  let createdOrder;
  try {
    createdOrder = await prisma.$transaction(async (tx) => {
    const dbCart = await tx.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: {
        coupon: true,
        items: {
          include: {
            product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true } },
            variant: { include: { inventory: true } },
          },
        },
      },
    });

    if (dbCart.items.length === 0) {
      throw new Error("Carrinho vazio.");
    }

    for (const item of dbCart.items) {
      const inventory = item.variant?.inventory ?? item.product.inventory.find((entry) => entry.variantId === null) ?? null;
      const available = inventory ? inventory.quantity - inventory.reserved : 0;

      if (available < item.quantity) {
        throw new Error(`Estoque insuficiente para ${item.product.name}. Disponível: ${available} unidade(s).`);
      }
    }

    const subtotal = dbCart.items.reduce((sum, item) => {
      return sum + (toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0)) * item.quantity;
    }, 0);
    const shippingCost = data.shippingType === "PICKUP" ? 0 : cart.shippingCost;
    const discount = calculateDiscount(
      dbCart.coupon,
      subtotal,
      shippingCost,
      dbCart.items.map((item) => ({
        productId: item.productId,
        categoryId: item.product.categoryId,
        total: (toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0)) * item.quantity,
      })),
    );
    const total = Math.max(subtotal + shippingCost - discount, 0);
    const paymentFee = roundMoney(total * (financialSettings.mercadoPagoRate / 100));
    const fixedFee = total > 0 ? financialSettings.fixedTransactionFee : 0;
    const shippingCostPaidByStore =
      data.shippingType === "DELIVERY" ? financialSettings.defaultShippingCostPaidByStore : 0;
    const basisTotal = subtotal > 0 ? subtotal : 1;
    const financialItems = dbCart.items.map((item) => {
      const unitPrice = toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0);
      const itemTotal = roundMoney(unitPrice * item.quantity);
      const ratio = itemTotal / basisTotal;
      const unitCost = toNumber(item.variant?.costPrice ?? item.product.costPrice ?? 0);
      const unitPackagingCost = toNumber(
        item.variant?.packagingCost ?? item.product.packagingCost ?? financialSettings.defaultPackagingCost,
      );
      const productCost = roundMoney(unitCost * item.quantity);
      const packagingCost = roundMoney(unitPackagingCost * item.quantity);
      const discountAllocated = roundMoney(discount * ratio);
      const paymentFeeAllocated = roundMoney(paymentFee * ratio);
      const fixedFeeAllocated = roundMoney(fixedFee * ratio);
      const shippingCostAllocated = roundMoney(shippingCostPaidByStore * ratio);
      const taxRate = toNumber(item.product.estimatedTaxRate ?? financialSettings.estimatedTaxRate);
      const taxableRevenue = Math.max(itemTotal - discountAllocated, 0);
      const taxAllocated = roundMoney(taxableRevenue * (taxRate / 100));
      const grossProfit = roundMoney(taxableRevenue - productCost);
      const netProfit = roundMoney(
        grossProfit - packagingCost - paymentFeeAllocated - fixedFeeAllocated - shippingCostAllocated - taxAllocated,
      );

      return {
        item,
        unitPrice,
        itemTotal,
        unitCost,
        unitPackagingCost,
        productCost,
        packagingCost,
        discountAllocated,
        paymentFeeAllocated,
        fixedFeeAllocated,
        shippingCostAllocated,
        taxAllocated,
        grossProfit,
        netProfit,
        profitMargin: marginPercent(netProfit, taxableRevenue),
      };
    });
    const productsCost = roundMoney(financialItems.reduce((sum, item) => sum + item.productCost, 0));
    const packagingCost = roundMoney(financialItems.reduce((sum, item) => sum + item.packagingCost, 0));
    const estimatedTax = roundMoney(financialItems.reduce((sum, item) => sum + item.taxAllocated, 0));
    const grossProfit = roundMoney(financialItems.reduce((sum, item) => sum + item.grossProfit, 0));
    const netProfit = roundMoney(financialItems.reduce((sum, item) => sum + item.netProfit, 0));
    const netRevenue = roundMoney(total - paymentFee - fixedFee);
    const financialByCartItem = new Map(financialItems.map((item) => [item.item.id, item]));

    let addressId: string | undefined;

    if (deliveryAddress && user?.id) {
      const address = await tx.address.create({
        data: {
          userId: user.id,
          label: "Checkout",
          recipient: sanitizeText(data.customerName),
          zipCode: sanitizeText(deliveryAddress.zipCode),
          street: sanitizeText(deliveryAddress.street),
          number: sanitizeText(deliveryAddress.number),
          complement: sanitizeOptionalText(deliveryAddress.complement),
          district: sanitizeText(deliveryAddress.district),
          city: sanitizeText(deliveryAddress.city),
          state: sanitizeText(deliveryAddress.state).toUpperCase(),
        },
      });
      addressId = address.id;
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: user?.id,
        couponId: dbCart.couponId,
        customerName: sanitizeText(data.customerName),
        customerEmail: data.customerEmail,
        customerPhone: sanitizeText(data.customerPhone),
        document: sanitizeOptionalText(data.document),
        shippingType: data.shippingType,
        shippingMethodId: data.shippingType === "DELIVERY" ? data.shippingMethodId : undefined,
        pickupLocationId: data.shippingType === "PICKUP" ? data.pickupLocationId : undefined,
        shippingAddressId: addressId,
        pickupProtocol,
        subtotal,
        discount,
        shippingCost,
        total,
        grossRevenue: roundMoney(subtotal + shippingCost),
        netRevenue,
        productsCost,
        paymentFee,
        fixedFee,
        packagingCost,
        estimatedTax,
        shippingCostPaidByStore,
        grossProfit,
        netProfit,
        profitMargin: marginPercent(netProfit, Math.max(subtotal - discount, 0)),
        notes: sanitizeOptionalText(data.notes),
        shippingSnapshot:
          deliveryAddress
            ? {
                zipCode: deliveryAddress.zipCode,
                street: deliveryAddress.street,
                number: deliveryAddress.number,
                complement: deliveryAddress.complement,
                district: deliveryAddress.district,
                city: deliveryAddress.city,
                state: deliveryAddress.state,
              }
            : undefined,
      },
    });

    await tx.orderItem.createMany({
      data: dbCart.items.map((item) => {
        const financial = financialByCartItem.get(item.id);
        const unitPrice = financial?.unitPrice ?? toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0);

        return {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          sku: item.variant?.sku ?? item.product.sku,
          imageUrl: item.product.images[0]?.url,
          quantity: item.quantity,
          unitPrice,
          total: unitPrice * item.quantity,
          unitCost: financial?.unitCost ?? 0,
          unitPackagingCost: financial?.unitPackagingCost ?? 0,
          productCost: financial?.productCost ?? 0,
          discountAllocated: financial?.discountAllocated ?? 0,
          paymentFeeAllocated: financial?.paymentFeeAllocated ?? 0,
          fixedFeeAllocated: financial?.fixedFeeAllocated ?? 0,
          shippingCostAllocated: financial?.shippingCostAllocated ?? 0,
          taxAllocated: financial?.taxAllocated ?? 0,
          grossProfit: financial?.grossProfit ?? 0,
          netProfit: financial?.netProfit ?? 0,
          profitMargin: financial?.profitMargin ?? 0,
          attributes: item.variant?.attributes ?? undefined,
        };
      }),
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        method: data.paymentMethod,
        status: "PENDING",
        amount: total,
      },
    });

    if (dbCart.couponId) {
      await tx.coupon.update({
        where: { id: dbCart.couponId },
        data: { usageCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: dbCart.id } });
    await tx.cart.delete({ where: { id: dbCart.id } });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        items: true,
        payments: true,
      },
    });
    });
  } catch (error) {
    if (isDatabaseUnavailable(error) && isDemoModeAllowed()) {
      const demoOrder = await createDemoOrder({
        customerName: sanitizeText(data.customerName),
        customerEmail: data.customerEmail,
        customerPhone: sanitizeText(data.customerPhone),
        shippingType: data.shippingType,
        paymentMethod: data.paymentMethod,
      });
      redirect(`/pedido/${demoOrder.orderNumber}`);
    }
    throw error;
  }

  try {
    const preference = await createMercadoPagoPreference(createdOrder);
    const checkoutUrl = getMercadoPagoCheckoutUrl(preference);
    await prisma.payment.update({
      where: { id: createdOrder.payments[0].id },
      data: {
        preferenceId: preference.id,
        checkoutUrl,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE);
  redirect(`/pedido/${createdOrder.orderNumber}`);
}
