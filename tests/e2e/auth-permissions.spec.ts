import { expect, test } from "@playwright/test";
import { loginBackoffice, loginCustomer } from "./helpers";

test.describe("autenticação e permissões", () => {
  test("login oferece Google sem remover e-mail e senha", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();

    const providersResponse = await page.request.get("/api/auth/providers");
    expect(providersResponse.ok()).toBeTruthy();
    const providers = await providersResponse.json();
    expect(providers).toHaveProperty("google");
    expect(providers).toHaveProperty("credentials");
  });

  test("usuário deslogado é redirecionado nas áreas privadas", async ({ page }) => {
    await page.goto("/admin/produtos");
    await expect(page).toHaveURL(/\/admin\/login\?callbackUrl=/);

    await page.goto("/pdv");
    await expect(page).toHaveURL(/\/pdv\/login\?callbackUrl=/);

    const adminManifest = await page.request.get("/admin/manifest.webmanifest", { maxRedirects: 0 });
    const pdvManifest = await page.request.get("/pdv/manifest.webmanifest", { maxRedirects: 0 });
    expect(adminManifest.status()).not.toBe(200);
    expect(pdvManifest.status()).not.toBe(200);
  });

  test("cliente não acessa admin nem PDV", async ({ page }) => {
    await loginCustomer(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?error=unauthorized/);

    await page.goto("/pdv");
    await expect(page).toHaveURL(/\/pdv\/login\?error=unauthorized/);
  });

  test("caixa acessa somente o PDV", async ({ page }) => {
    await loginBackoffice(page, "pdv", "caixa@xnutri.com.br", "Caixa@12345");
    await expect(page.getByText(/Caixa (fechado|aberto)/i).first()).toBeVisible();

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/pdv/manifest.webmanifest");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("crossorigin", "use-credentials");
    await expect(page.locator('[data-pwa-install="/pdv"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

    const pdvManifestResponse = await page.request.get("/pdv/manifest.webmanifest");
    expect(pdvManifestResponse.status()).toBe(200);
    expect(pdvManifestResponse.headers()["content-type"]).toContain("application/manifest+json");
    await expect(pdvManifestResponse.json()).resolves.toMatchObject({
      id: "/pdv",
      start_url: "/pdv",
      scope: "/pdv",
    });

    const adminManifestResponse = await page.request.get("/admin/manifest.webmanifest", { maxRedirects: 0 });
    expect(adminManifestResponse.status()).toBe(404);

    await page.goto("/admin/produtos");
    await expect(page).toHaveURL(/\/admin\/login\?error=unauthorized/);
  });

  test("gerente acessa produtos e relatórios, mas não o financeiro", async ({ page }) => {
    await loginBackoffice(page, "admin", "gerente@xnutri.com.br", "Gerente@12345");
    await page.goto("/admin/produtos");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    await expect(page.locator('[data-pwa-install="/admin"]')).toHaveCount(0);

    const upload = await page.request.post("/api/admin/uploads/cloudinary", {
      headers: { Origin: "http://127.0.0.1:3100" },
      multipart: {
        file: {
          name: "produto.png",
          mimeType: "image/png",
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        },
      },
    });
    expect(upload.status()).toBe(503);
    expect(await upload.json()).toMatchObject({ error: expect.stringMatching(/Cloudinary/i) });

    await page.goto("/admin/relatorios");
    await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible();

    await page.goto("/admin/financeiro");
    await expect(page).toHaveURL(/\/admin\/login\?error=unauthorized/);

    const pdvManifest = await page.request.get("/pdv/manifest.webmanifest", { maxRedirects: 0 });
    expect(pdvManifest.status()).toBe(404);
  });

  test("admin acessa dashboard, produtos, financeiro e auditoria", async ({ page }) => {
    await loginBackoffice(page, "admin", "admin@xnutri.com.br", "Admin@12345");

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin/manifest.webmanifest");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("crossorigin", "use-credentials");
    await expect(page.locator('[data-pwa-install="/admin"]')).toBeVisible();

    const adminManifestResponse = await page.request.get("/admin/manifest.webmanifest");
    const pdvManifestResponse = await page.request.get("/pdv/manifest.webmanifest");
    expect(adminManifestResponse.status()).toBe(200);
    expect(pdvManifestResponse.status()).toBe(200);
    await expect(adminManifestResponse.json()).resolves.toMatchObject({
      id: "/admin",
      start_url: "/admin",
      scope: "/admin",
    });

    for (const path of ["/admin", "/admin/produtos", "/admin/financeiro", "/admin/auditoria"]) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/admin\/login/);
      await expect(page.locator("main, .admin-shell").first()).toBeVisible();
    }
  });

  test("APIs de PDV e upload rejeitam usuário deslogado", async ({ request }) => {
    const products = await request.get("/api/pdv/products?q=creatina", { maxRedirects: 0 });
    expect(products.status()).toBe(401);

    const upload = await request.post("/api/admin/uploads/cloudinary", {
      maxRedirects: 0,
      multipart: {
        file: {
          name: "payload.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not an image"),
        },
      },
    });
    expect(upload.status()).toBe(401);
  });

  test("service workers dos aplicativos são network-only e não ficam em cache", async ({ request }) => {
    for (const path of ["/admin-sw.js", "/pdv-sw.js"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/javascript");
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["content-security-policy"]).toContain("script-src 'self'");

      const source = await response.text();
      expect(source).toContain("event.respondWith(fetch(event.request))");
      expect(source).not.toContain("caches.open");
    }
  });
});
