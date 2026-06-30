import { prisma } from "@/lib/db/prisma";
import { fallbackPickup } from "@/lib/fallback/catalog";
import { lookupCep, validateCep } from "@/lib/shipping/cep";
import { toNumber } from "@/lib/utils";

export type ShippingQuote = {
  methodId: string;
  name: string;
  provider: "CORREIOS" | "MANUAL" | "PICKUP";
  price: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  description: string;
};

export async function quoteShipping(zipCode: string, subtotal: number): Promise<ShippingQuote[]> {
  const cep = validateCep(zipCode);
  if (!cep) {
    throw new Error("CEP inválido.");
  }

  const address = await lookupCep(cep);
  if (!address) {
    throw new Error("CEP nao encontrado. Confira o numero informado.");
  }

  const methods = await prisma.shippingMethod.findMany({
    where: { active: true },
    orderBy: [{ provider: "asc" }, { basePrice: "asc" }],
  }).catch(() => [
    {
      id: "fallback-manual",
      name: "Frete Manual Mirassol e Região",
      code: "manual-regional",
      provider: "MANUAL" as const,
      active: true,
      basePrice: 14.9,
      freeAbove: 199,
      deliveryDaysMin: 1,
      deliveryDaysMax: 2,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "fallback-sedex",
      name: "Correios Sedex",
      code: "correios-sedex",
      provider: "CORREIOS" as const,
      active: true,
      basePrice: 39.9,
      freeAbove: 399,
      deliveryDaysMin: 1,
      deliveryDaysMax: 3,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  return methods
    .filter((method) => method.provider !== "PICKUP")
    .map((method) => {
      const base = toNumber(method.basePrice);
      const freeAbove = method.freeAbove ? toNumber(method.freeAbove) : null;
      const price = freeAbove && subtotal >= freeAbove ? 0 : base;
      const isRegional = method.provider === "MANUAL";

      return {
        methodId: method.id,
        name: method.name,
        provider: method.provider,
        price,
        deliveryDaysMin: method.deliveryDaysMin,
        deliveryDaysMax: method.deliveryDaysMax,
        description: isRegional
          ? "Entrega manual para Mirassol e região com acompanhamento interno."
          : "Estrutura Correios pronta para credenciais oficiais e códigos de serviço.",
      };
    });
}

export async function getPickupOptions() {
  return prisma.pickupLocation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  }).catch(() => [fallbackPickup]);
}
