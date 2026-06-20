import type { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDemoAdminSession } from "@/lib/auth/demo-admin";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable } from "@/lib/db/errors";

export type AdminModule =
  | "dashboard"
  | "products"
  | "categories"
  | "inventory"
  | "coupons"
  | "orders"
  | "customers"
  | "reports"
  | "finance"
  | "content"
  | "shipping"
  | "settings"
  | "audit";

const readAccess: Record<AdminRole, AdminModule[]> = {
  ADMIN: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "finance", "content", "shipping", "settings", "audit"],
  MANAGER: ["dashboard", "products", "categories", "inventory", "orders", "customers", "reports", "finance"],
  VIEWER: ["dashboard", "orders", "reports", "finance"],
};

const writeAccess: Record<AdminRole, AdminModule[]> = {
  ADMIN: readAccess.ADMIN,
  MANAGER: ["products", "categories", "inventory", "orders", "finance"],
  VIEWER: [],
};

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect(redirectTo);
  }

  return user;
}

export async function getCurrentAdmin() {
  const demoAdmin = await getDemoAdminSession();
  if (demoAdmin) return demoAdmin;

  const user = await getCurrentUser();
  if (!user?.id || user.role !== "ADMIN") return null;

  let admin;
  try {
    admin = await prisma.adminUser.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) return null;
    throw error;
  }

  if (!admin?.active) return null;

  return {
    ...user,
    admin,
    adminRole: admin.role,
  };
}

export function canAccessAdminModule(role: AdminRole, module: AdminModule, write = false) {
  return (write ? writeAccess : readAccess)[role].includes(module);
}

export async function requireAdmin(module: AdminModule = "dashboard", write = false) {
  const demoAdmin = await getDemoAdminSession();
  if (demoAdmin) {
    if (!canAccessAdminModule(demoAdmin.adminRole, module, write)) {
      redirect("/admin?demo=1");
    }
    return demoAdmin;
  }

  const user = await requireUser("/admin/login");

  if (user.role !== "ADMIN") {
    redirect("/admin/login?error=unauthorized");
  }

  let admin;
  try {
    admin = await prisma.adminUser.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      redirect("/admin/login?error=database");
    }
    throw error;
  }

  if (!admin?.active || !canAccessAdminModule(admin.role, module, write)) {
    redirect("/admin/login?error=unauthorized");
  }

  return {
    ...user,
    admin,
    adminRole: admin.role,
  };
}
