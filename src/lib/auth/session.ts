import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDemoAdminSession } from "@/lib/auth/demo-admin";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable } from "@/lib/db/errors";
import { getClientIp } from "@/lib/security/request";
import { canAccessAdminModule, type AdminModule } from "@/lib/auth/permissions";

export { canAccessAdminModule, type AdminModule } from "@/lib/auth/permissions";

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

async function recordAccessDenied(input: {
  userId: string;
  adminUserId?: string;
  target: string;
  role?: string;
}) {
  const ipAddress = await getClientIp().catch(() => undefined);
  await prisma.auditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: "auth.access.denied",
      entity: "security",
      entityId: input.userId,
      ipAddress,
      metadata: { target: input.target, role: input.role ?? "unknown" },
    },
  }).catch(() => undefined);
}

export async function requireAdmin(module: AdminModule = "dashboard", write = false) {
  const demoAdmin = await getDemoAdminSession();
  if (demoAdmin) {
    if (module !== "dashboard" || write || !canAccessAdminModule(demoAdmin.adminRole, module, write)) {
      redirect("/admin?demo=1");
    }
    return demoAdmin;
  }

  const user = await requireUser("/admin/login");

  if (user.role !== "ADMIN") {
    await recordAccessDenied({ userId: user.id, target: `admin:${module}`, role: user.role });
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
    await recordAccessDenied({ userId: user.id, adminUserId: admin?.id, target: `admin:${module}`, role: admin?.role });
    redirect("/admin/login?error=unauthorized");
  }

  return {
    ...user,
    admin,
    adminRole: admin.role,
  };
}

export async function requirePOS(write = false) {
  const demoAdmin = await getDemoAdminSession();
  if (demoAdmin) return demoAdmin;

  const user = await requireUser("/pdv/login");

  if (user.role !== "ADMIN") {
    await recordAccessDenied({ userId: user.id, target: "pdv", role: user.role });
    redirect("/pdv/login?error=unauthorized");
  }

  let admin;
  try {
    admin = await prisma.adminUser.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      redirect("/pdv/login?error=database");
    }
    throw error;
  }

  if (!admin?.active || !canAccessAdminModule(admin.role, "pos", write)) {
    await recordAccessDenied({ userId: user.id, adminUserId: admin?.id, target: "pdv", role: admin?.role });
    redirect("/pdv/login?error=unauthorized");
  }

  return {
    ...user,
    admin,
    adminRole: admin.role,
  };
}
