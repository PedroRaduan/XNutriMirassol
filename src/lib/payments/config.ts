const disabledValues = new Set(["false", "0", "off", "disabled"]);

export function isPagBankCheckoutEnabled() {
  const configuredValue = process.env.PAGBANK_CHECKOUT_ENABLED?.trim().toLowerCase();
  return !configuredValue || !disabledValues.has(configuredValue);
}

export const pagBankUnavailableMessage =
  "O pagamento online está temporariamente indisponível. Seus produtos continuam no carrinho; fale com a XNutri pelo WhatsApp ou tente novamente mais tarde.";
