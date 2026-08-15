"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { clearDemoAdminSession, createDemoAdminSession } from "@/lib/auth/demo-admin";
import { canAccessAdminModule, requireUser } from "@/lib/auth/session";
import { DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable, isDemoModeAllowed } from "@/lib/db/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, assertSameOrigin } from "@/lib/security/request";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { addressSchema, loginSchema, passwordRecoverySchema, profileSchema, registerSchema } from "@/lib/validations";

export type ActionState = {
  ok: boolean;
  message: string;
};

function getSafeCustomerRedirect(formData: FormData) {
  const target = String(formData.get("callbackUrl") ?? "/cliente");
  const isInternalPath = target.startsWith("/") && !target.startsWith("//");
  const isRestrictedArea = target.startsWith("/admin") || target.startsWith("/pdv");
  return isInternalPath && !isRestrictedArea && target !== "/login" ? target : "/cliente";
}

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
      redirectTo: getSafeCustomerRedirect(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "E-mail ou senha inválidos." };
    }

    throw error;
  }

  return { ok: true, message: "Login efetuado." };
}

export async function loginWithGoogle(formData: FormData) {
  await assertSameOrigin();
  const googleConfigured = Boolean(
    (process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID) &&
      (process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET),
  );

  if (!googleConfigured) {
    redirect("/login?error=GoogleNotConfigured");
  }

  await signIn("google", { redirectTo: getSafeCustomerRedirect(formData) });
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
      if (isDemoModeAllowed()) {
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

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    admin?.user.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!admin?.user.passwordHash || !passwordMatches) {
    if (admin) {
      await prisma.auditLog.create({
        data: {
          adminUserId: admin.id,
          action: "auth.login.failed",
          entity: "security",
          entityId: admin.userId,
          ipAddress: ip,
          metadata: { reason: "invalid_credentials" },
        },
      }).catch(() => undefined);
    }
    return { ok: false, message: "Acesso administrativo não autorizado." };
  }

  if (isSafePOSTarget && !canAccessAdminModule(admin.role, "pos")) {
    return { ok: false, message: "Acesso administrativo não autorizado." };
  }

  await prisma.auditLog.create({
    data: {
      adminUserId: admin.id,
      action: "auth.login.success",
      entity: "security",
      entityId: admin.userId,
      ipAddress: ip,
      metadata: { target: redirectTo.startsWith("/pdv") ? "pdv" : "admin" },
    },
  }).catch(() => undefined);

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

  // O hash é calculado antes da consulta para reduzir diferenças de tempo entre
  // e-mails existentes e novos. A mensagem também não confirma a existência.
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existing) {
    return {
      ok: false,
      message: "Não foi possível concluir o cadastro. Se você já possui uma conta, entre ou recupere sua senha.",
    };
  }

  try {
    await prisma.user.create({
      data: {
        name: sanitizeText(parsed.data.name),
        email: parsed.data.email,
        phone: sanitizeText(parsed.data.phone),
        passwordHash,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return {
        ok: false,
        message: "Não foi possível concluir o cadastro. Se você já possui uma conta, entre ou recupere sua senha.",
      };
    }
    throw error;
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/cliente",
  });

  return { ok: true, message: "Cadastro criado." };
}

export async function logout() {
  await assertSameOrigin();
  await clearDemoAdminSession();
  await signOut({ redirectTo: "/" });
}

export async function enterDemoAdmin() {
  await assertSameOrigin();
  if (!isDemoModeAllowed()) {
    redirect("/admin/login?error=database");
  }
  await createDemoAdminSession();
  redirect("/admin?demo=1");
}

export async function enterDemoPOS() {
  await assertSameOrigin();
  if (!isDemoModeAllowed()) {
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

  return {
    ok: true,
    message: "Se a conta existir, as instruções serão enviadas quando o serviço de e-mail estiver configurado. Enquanto isso, fale com a XNutri pelo WhatsApp.",
  };
}

export async function updateProfile(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    document: formData.get("document") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados de perfil inválidos.");
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: sanitizeText(parsed.data.name),
        phone: sanitizeOptionalText(parsed.data.phone),
        document: sanitizeOptionalText(parsed.data.document),
      },
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error) || !isDemoModeAllowed()) throw error;
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
    if (!isDatabaseUnavailable(error) || !isDemoModeAllowed()) throw error;
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
    if (!isDatabaseUnavailable(error) || !isDemoModeAllowed()) throw error;
  }

  revalidatePath("/cliente/enderecos");
}

export async function redirectToLogin() {
  redirect("/login");
}
