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

  if (!origin) return;

  const normalizeOrigin = (value: string) => {
    try {
      return new URL(value).origin;
    } catch {
      return "";
    }
  };
  const hosts = [headerStore.get("host"), headerStore.get("x-forwarded-host")]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const forwardedProtocols = (headerStore.get("x-forwarded-proto") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value === "http" || value === "https");
  const allowedOrigins = new Set([normalizeOrigin(getBaseUrl())]);

  for (const host of hosts) {
    const protocols = forwardedProtocols.length > 0 ? forwardedProtocols : ["http", "https"];
    for (const protocol of protocols) {
      allowedOrigins.add(`${protocol}://${host}`);
    }
  }

  if (!allowedOrigins.has(normalizeOrigin(origin))) {
    throw new Error("Origem inválida para esta operação.");
  }
}
