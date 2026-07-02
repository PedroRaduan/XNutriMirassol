import type { AdminRole } from "@prisma/client";

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
  | "audit"
  | "pos";

const readAccess: Record<AdminRole, AdminModule[]> = {
  ADMIN: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "finance", "content", "shipping", "settings", "audit", "pos"],
  MANAGER: ["dashboard", "products", "inventory", "orders", "reports"],
  CASHIER: ["pos"],
  VIEWER: ["dashboard", "orders", "reports", "finance"],
};

const writeAccess: Record<AdminRole, AdminModule[]> = {
  ADMIN: readAccess.ADMIN,
  MANAGER: ["products", "inventory", "orders"],
  CASHIER: ["pos"],
  VIEWER: [],
};

export function canAccessAdminModule(role: AdminRole, module: AdminModule, write = false) {
  return (write ? writeAccess : readAccess)[role].includes(module);
}
