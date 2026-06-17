import type { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export type AdminModule =
  | "dashboard"
  | "products"
  | "categories"
  | "inventory"
  | "coupons"
  | "orders"
  | "customers"
  | "reports"
  | "content"
  | "shipping"
  | "settings"
  | "audit";

const readAccess: Record<AdminRole, AdminModule[]> = {
  ADMIN: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "content", "shipping", "settings", "audit"],
  MANAGER: ["dashboard", "products", "categories", "inventory", "orders", "customers", "reports"],
  VIEWER: ["dashboard", "orders", "reports"],
};

const writeAccess: Record<AdminRole, AdminModule[]> = {
  ADMIN: readAccess.ADMIN,
  MANAGER: ["products", "categories", "inventory", "orders"],
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
  const user = await getCurrentUser();
  if (!user?.id || user.role !== "ADMIN") return null;

  const admin = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });

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
  const user = await requireUser("/admin/login");

  if (user.role !== "ADMIN") {
    redirect("/admin/login?error=unauthorized");
  }

  const admin = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });

  if (!admin?.active || !canAccessAdminModule(admin.role, module, write)) {
    redirect("/admin/login?error=unauthorized");
  }

  return {
    ...user,
    admin,
    adminRole: admin.role,
  };
}
