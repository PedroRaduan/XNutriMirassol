"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getClientIp, assertSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { newsletterSchema } from "@/lib/validations";

export type NewsletterActionState = {
  ok: boolean;
  message: string;
};

export async function subscribeNewsletter(
  _: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limited = rateLimit(`newsletter:${ip}`, 5, 60_000);

    if (!limited.ok) {
      return { ok: false, message: "Muitas tentativas. Aguarde alguns instantes." };
    }

    const parsed = newsletterSchema.safeParse({
      email: formData.get("email"),
      name: formData.get("name") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "E-mail inválido." };
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      create: {
        email: parsed.data.email,
        name: sanitizeOptionalText(parsed.data.name),
        source: "home",
      },
      update: {
        active: true,
        name: sanitizeOptionalText(parsed.data.name),
      },
    });

    revalidatePath("/");
    return { ok: true, message: "Cadastro feito! Você receberá as novidades da XNutri." };
  } catch {
    return { ok: false, message: "Não foi possível cadastrar agora. Tente novamente em instantes." };
  }
}
