import type { AdminRole } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable } from "@/lib/db/errors";

export const DEMO_ADMIN_COOKIE = "xnutri_demo_admin";

async function databaseIsUnavailable() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return false;
  } catch (error) {
    return isDatabaseUnavailable(error);
  }
}

export async function createDemoAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function clearDemoAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_ADMIN_COOKIE);
}

export async function getDemoAdminSession() {
  if (process.env.NODE_ENV === "production") return null;

  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_ADMIN_COOKIE)?.value !== "1") return null;

  const offline = await databaseIsUnavailable();
  if (!offline) {
    await clearDemoAdminSession();
    return null;
  }

  const adminRole: AdminRole = "ADMIN";

  return {
    id: "demo-admin-user",
    name: "Administrador Demo XNutri",
    email: "admin.demo@xnutri.local",
    role: "ADMIN" as const,
    adminRole,
    isDemo: true,
    admin: {
      id: "demo-admin",
      userId: "demo-admin-user",
      role: adminRole,
      permissions: { demo: true },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}
