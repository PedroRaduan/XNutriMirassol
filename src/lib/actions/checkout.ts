"use server";

import { revalidatePath } from "next/cache";
import { createOrderFromCheckout } from "@/lib/ecommerce/orders";
import { assertSameOrigin } from "@/lib/security/request";

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

export async function submitCheckout(_: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  try {
    await assertSameOrigin();
    await createOrderFromCheckout(formData);
    revalidatePath("/carrinho");
    revalidatePath("/checkout");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível finalizar o pedido.",
    };
  }

  return { ok: true, message: "Pedido enviado." };
}
