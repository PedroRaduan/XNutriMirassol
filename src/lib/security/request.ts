import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/utils";

export async function getClientIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local"
  );
}

export async function assertSameOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  const appUrl = getBaseUrl();

  if (!origin) return;
  const expected = host ? `http${host.includes("localhost") ? "" : "s"}://${host}` : appUrl;

  if (origin !== expected && origin !== appUrl) {
    throw new Error("Origem inválida para esta operação.");
  }
}
