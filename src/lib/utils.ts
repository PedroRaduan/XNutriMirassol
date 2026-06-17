import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number | string | { toString(): string }) {
  const numeric = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }
  return 0;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    PREPARING: "Em preparacao",
    AWAITING_PICKUP: "Aguardando retirada",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
  };

  return labels[status] ?? status;
}

export function statusBadgeClass(status: string) {
  const classes: Record<string, string> = {
    PENDING: "status-badge status-pending",
    PAID: "status-badge status-paid",
    PREPARING: "status-badge status-preparing",
    AWAITING_PICKUP: "status-badge status-pickup",
    SHIPPED: "status-badge status-shipped",
    DELIVERED: "status-badge status-delivered",
    CANCELED: "status-badge status-canceled",
    REFUNDED: "status-badge status-refunded",
    APPROVED: "status-badge status-paid",
    REJECTED: "status-badge status-canceled",
  };

  return classes[status] ?? "status-badge";
}

export function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `XN${date}${random}`;
}
