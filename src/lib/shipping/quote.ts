import { prisma } from "@/lib/db/prisma";
import { demoFallbackOrThrow } from "@/lib/db/errors";
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

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function supportsDeliveryAddress(
  method: { provider: "CORREIOS" | "MANUAL" | "PICKUP"; settings: unknown },
  address: { city: string },
) {
  if (method.provider !== "MANUAL") return true;
  if (!method.settings || typeof method.settings !== "object" || !("cities" in method.settings)) return false;

  const cities = (method.settings as { cities?: unknown }).cities;
  if (!Array.isArray(cities)) return false;

  const destination = normalizeLocation(address.city);
  return cities.some((city) => typeof city === "string" && normalizeLocation(city) === destination);
}

export async function quoteShipping(zipCode: string, subtotal: number): Promise<ShippingQuote[]> {
  const cep = validateCep(zipCode);
  if (!cep) {
    throw new Error("CEP inválido.");
  }

  const address = await lookupCep(cep);
  if (!address) {
    throw new Error("CEP não encontrado. Confira o número informado.");
  }

  const methods = await prisma.shippingMethod.findMany({
    where: { active: true },
    orderBy: [{ provider: "asc" }, { basePrice: "asc" }],
  }).catch((error) => demoFallbackOrThrow(error, () => [
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
  ]));

  return methods
    .filter((method) => method.provider !== "PICKUP" && supportsDeliveryAddress(method, address))
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
          : "Estimativa configurada para envio pelos Correios conforme o CEP informado.",
      };
    });
}

export async function getPickupOptions() {
  return prisma.pickupLocation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  }).catch((error) => demoFallbackOrThrow(error, () => [fallbackPickup]));
}
