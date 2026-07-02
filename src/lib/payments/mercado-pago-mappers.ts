export function getMercadoPagoCheckoutUrl(preference: {
  init_point?: string | null;
  sandbox_init_point?: string | null;
}) {
  const environment = process.env.MERCADO_PAGO_ENVIRONMENT ?? "sandbox";
  return environment === "production"
    ? preference.init_point ?? preference.sandbox_init_point ?? null
    : preference.sandbox_init_point ?? preference.init_point ?? null;
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
