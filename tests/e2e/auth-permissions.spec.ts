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

    await page.goto("/admin/produtos");
    await expect(page).toHaveURL(/\/admin\/login\?error=unauthorized/);
  });

  test("gerente acessa produtos e relatórios, mas não o financeiro", async ({ page }) => {
    await loginBackoffice(page, "admin", "gerente@xnutri.com.br", "Gerente@12345");
    await page.goto("/admin/produtos");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();

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
  });

  test("admin acessa dashboard, produtos, financeiro e auditoria", async ({ page }) => {
    await loginBackoffice(page, "admin", "admin@xnutri.com.br", "Admin@12345");
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
});
