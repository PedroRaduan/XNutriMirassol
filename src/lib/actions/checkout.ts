"use server";

import { revalidatePath } from "next/cache";
import { createOrderFromCheckout } from "@/lib/ecommerce/orders";
import { assertSameOrigin } from "@/lib/security/request";

export async function submitCheckout(formData: FormData) {
  await assertSameOrigin();
  await createOrderFromCheckout(formData);
  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}
