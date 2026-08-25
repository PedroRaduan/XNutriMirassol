import { afterEach, describe, expect, it, vi } from "vitest";

async function loadContentSecurityPolicy(vercelEnvironment: "preview" | "production") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", vercelEnvironment);

  const { default: nextConfig } = await import("../../next.config");
  const headerRules = await nextConfig.headers?.();
  const globalRule = headerRules?.find((rule) => rule.source === "/(.*)");

  return globalRule?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Content Security Policy da Vercel", () => {
  it("libera somente as origens oficiais necessárias para o Toolbar no Preview", async () => {
    const policy = await loadContentSecurityPolicy("preview");

    expect(policy).toContain("script-src 'self' 'unsafe-inline' https://vercel.live");
    expect(policy).toContain("connect-src 'self' https://vercel.live wss://ws-us3.pusher.com");
    expect(policy).toContain("img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://vercel.live https://vercel.com");
    expect(policy).toContain("frame-src 'self' https://*.pagseguro.com https://*.pagseguro.uol.com.br https://vercel.live");
    expect(policy).toContain("font-src 'self' data: https://vercel.live https://assets.vercel.com");
  });

  it("não libera Vercel Live no ambiente Production", async () => {
    const policy = await loadContentSecurityPolicy("production");

    expect(policy).not.toContain("vercel.live");
    expect(policy).not.toContain("assets.vercel.com");
    expect(policy).not.toContain("ws-us3.pusher.com");
  });
});
