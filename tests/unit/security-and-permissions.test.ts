import { describe, expect, it } from "vitest";
import { canAccessAdminModule } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";

describe("permissões administrativas", () => {
  it("mantém os limites de ADMIN, MANAGER, CASHIER e VIEWER", () => {
    expect(canAccessAdminModule("ADMIN", "settings", true)).toBe(true);
    expect(canAccessAdminModule("MANAGER", "products", true)).toBe(true);
    expect(canAccessAdminModule("MANAGER", "finance", false)).toBe(false);
    expect(canAccessAdminModule("CASHIER", "pos", true)).toBe(true);
    expect(canAccessAdminModule("CASHIER", "products", false)).toBe(false);
    expect(canAccessAdminModule("VIEWER", "reports", false)).toBe(true);
    expect(canAccessAdminModule("VIEWER", "reports", true)).toBe(false);
  });
});

describe("proteções de entrada", () => {
  it("remove HTML e scripts de textos persistidos", () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>Olá <script>alert(2)</script>')).toBe("Olá");
    expect(sanitizeOptionalText("   ")).toBeUndefined();
  });

  it("bloqueia requisições depois do limite", () => {
    const key = `qa-${crypto.randomUUID()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });
});
