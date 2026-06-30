const DEFAULT_WHATSAPP_NUMBER = "5517997000000";
const DEFAULT_MESSAGE = "Olá! Vim pelo site da XNutri e quero atendimento.";

export function getWhatsAppHref(phone?: string | null, message = DEFAULT_MESSAGE) {
  const digits = phone?.replace(/\D/g, "") || DEFAULT_WHATSAPP_NUMBER;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
