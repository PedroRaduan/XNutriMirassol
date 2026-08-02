type PagBankLink = {
  rel?: string | null;
  href?: string | null;
  method?: string | null;
};

export function getPagBankCheckoutUrl(checkout: { links?: PagBankLink[] | null }) {
  return checkout.links?.find((link) => link.rel === "PAY" && link.method === "GET")?.href ?? null;
}

export function mapPagBankStatus(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "PAID") return "APPROVED" as const;
  if (normalized === "DECLINED") return "REJECTED" as const;
  if (normalized === "REFUNDED") return "REFUNDED" as const;
  if (normalized === "CANCELED" || normalized === "CANCELLED" || normalized === "EXPIRED") {
    return "CANCELED" as const;
  }
  return "PENDING" as const;
}

export function mapPagBankMethod(type?: string | null) {
  const normalized = type?.toUpperCase();
  if (normalized === "PIX") return "PIX" as const;
  if (normalized === "CREDIT_CARD") return "CREDIT_CARD" as const;
  if (normalized === "DEBIT_CARD") return "DEBIT_CARD" as const;
  if (normalized === "BOLETO") return "BOLETO" as const;
  return "UNKNOWN" as const;
}
