"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getClientIp, assertSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { newsletterSchema } from "@/lib/validations";

export async function subscribeNewsletter(formData: FormData) {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limited = rateLimit(`newsletter:${ip}`, 5, 60_000);

  if (!limited.ok) {
    throw new Error("Muitas tentativas. Aguarde alguns instantes.");
  }

  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "E-mail inválido.");
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
}
