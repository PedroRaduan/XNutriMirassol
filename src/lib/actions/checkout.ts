"use server";

import { revalidatePath } from "next/cache";
import { createOrderFromCheckout } from "@/lib/ecommerce/orders";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";

export type CheckoutActionState = {
  ok: boolean;
  message: string;
};

function isRedirectError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

function safeCheckoutError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const knownMessages = [
    "carrinho", "estoque", "produto", "cupom", "cep", "frete", "endereço", "retirada",
    "campo", "cpf", "cnpj", "privacidade", "pagamento", "pedido", "indisponível", "inválido",
  ];
  return knownMessages.some((term) => message.toLocaleLowerCase("pt-BR").includes(term))
    ? message
    : "Não foi possível finalizar o pedido agora. Seus dados continuam salvos; tente novamente em instantes.";
}

export async function submitCheckout(_: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limited = rateLimit(`checkout:${ip}`, 8, 10 * 60_000);
    if (!limited.ok) {
      return { ok: false, message: "Muitas tentativas de finalização. Aguarde alguns minutos e tente novamente." };
    }
    await createOrderFromCheckout(formData);
    revalidatePath("/carrinho");
    revalidatePath("/checkout");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      ok: false,
      message: safeCheckoutError(error),
    };
  }

  return { ok: true, message: "Pedido enviado." };
}
