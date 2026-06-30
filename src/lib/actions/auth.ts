"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { clearDemoAdminSession, createDemoAdminSession } from "@/lib/auth/demo-admin";
import { canAccessAdminModule, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable } from "@/lib/db/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, assertSameOrigin } from "@/lib/security/request";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { addressSchema, loginSchema, passwordRecoverySchema, registerSchema } from "@/lib/validations";

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function loginWithCredentials(_: ActionState, formData: FormData): Promise<ActionState> {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limit = rateLimit(`login:${ip}`, 8, 60_000);

  if (!limit.ok) {
    return { ok: false, message: "Muitas tentativas. Aguarde alguns instantes." };
  }

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/cliente",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "E-mail ou senha inválidos." };
    }

    throw error;
  }

  return { ok: true, message: "Login efetuado." };
}

export async function loginAdminWithCredentials(_: ActionState, formData: FormData): Promise<ActionState> {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limit = rateLimit(`admin-login:${ip}`, 8, 60_000);

  if (!limit.ok) {
    return { ok: false, message: "Muitas tentativas. Aguarde alguns instantes." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const callbackUrl = String(formData.get("callbackUrl") ?? "/admin");
  const isSafeAdminTarget = callbackUrl.startsWith("/admin") && callbackUrl !== "/admin/login";
  const isSafePOSTarget = callbackUrl.startsWith("/pdv") && callbackUrl !== "/pdv/login";
  const redirectTo = isSafeAdminTarget || isSafePOSTarget ? callbackUrl : "/admin";

  let admin;

  try {
    admin = await prisma.adminUser.findFirst({
      where: {
        active: true,
        user: {
          email: parsed.data.email,
          role: "ADMIN",
        },
      },
      include: { user: true },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      if (process.env.NODE_ENV !== "production") {
        await createDemoAdminSession();
        redirect(isSafePOSTarget ? "/pdv?demo=1" : "/admin?demo=1");
      }

      return {
        ok: false,
        message: "Banco de dados indisponível. Confira o PostgreSQL e tente novamente.",
      };
    }

    throw error;
  }

  if (!admin?.user.passwordHash) {
    return { ok: false, message: "Acesso administrativo não autorizado." };
  }

  if (isSafePOSTarget && !canAccessAdminModule(admin.role, "pos")) {
    return { ok: false, message: "Este usuário não tem permissão para acessar o PDV." };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, admin.user.passwordHash);
  if (!passwordMatches) {
    return { ok: false, message: "Acesso administrativo não autorizado." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Acesso administrativo não autorizado." };
    }

    if (isDatabaseUnavailable(error)) {
      return {
        ok: false,
        message: "Banco de dados offline. Inicie o PostgreSQL e tente novamente.",
      };
    }

    throw error;
  }

  return { ok: true, message: "Login administrativo efetuado." };
}

export async function registerCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limit = rateLimit(`register:${ip}`, 5, 60_000);

  if (!limit.ok) {
    return { ok: false, message: "Muitas tentativas. Aguarde alguns instantes." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, message: "Já existe uma conta com este e-mail." };
  }

  await prisma.user.create({
    data: {
      name: sanitizeText(parsed.data.name),
      email: parsed.data.email,
      phone: sanitizeText(parsed.data.phone),
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/cliente",
  });

  return { ok: true, message: "Cadastro criado." };
}

export async function logout() {
  await clearDemoAdminSession();
  await signOut({ redirectTo: "/" });
}

export async function enterDemoAdmin() {
  await assertSameOrigin();
  if (process.env.NODE_ENV === "production") {
    redirect("/admin/login?error=database");
  }
  await createDemoAdminSession();
  redirect("/admin?demo=1");
}

export async function enterDemoPOS() {
  await assertSameOrigin();
  if (process.env.NODE_ENV === "production") {
    redirect("/pdv/login?error=database");
  }
  await createDemoAdminSession();
  redirect("/pdv?demo=1");
}

export async function requestPasswordRecovery(_: ActionState, formData: FormData): Promise<ActionState> {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limit = rateLimit(`recovery:${ip}`, 4, 60_000);

  if (!limit.ok) {
    return { ok: false, message: "Muitas tentativas. Aguarde alguns instantes." };
  }

  const parsed = passwordRecoverySchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Informe um e-mail válido." };
  }

  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: `password-reset:${parsed.data.email}`,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 30),
    },
  });

  return {
    ok: true,
    message: "Se o e-mail existir, um link de recuperação será enviado pela integração de e-mail configurada.",
  };
}

export async function updateProfile(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: sanitizeText(String(formData.get("name") ?? "")),
        phone: sanitizeOptionalText(String(formData.get("phone") ?? "")),
        document: sanitizeOptionalText(String(formData.get("document") ?? "")),
      },
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
  }

  revalidatePath("/cliente/perfil");
}

export async function createAddress(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const parsed = addressSchema.safeParse({
    label: formData.get("label"),
    recipient: formData.get("recipient"),
    zipCode: formData.get("zipCode"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    district: formData.get("district"),
    city: formData.get("city"),
    state: formData.get("state"),
    reference: formData.get("reference"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Endereço inválido.");
  }

  try {
    await prisma.address.create({
      data: {
        ...parsed.data,
        complement: sanitizeOptionalText(parsed.data.complement),
        reference: sanitizeOptionalText(parsed.data.reference),
        userId: user.id,
        isDefault: (await prisma.address.count({ where: { userId: user.id } })) === 0,
      },
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
  }

  revalidatePath("/cliente/enderecos");
}

export async function deleteAddress(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await prisma.address.delete({
      where: {
        id,
        userId: user.id,
      },
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
  }

  revalidatePath("/cliente/enderecos");
}

export async function redirectToLogin() {
  redirect("/login");
}
