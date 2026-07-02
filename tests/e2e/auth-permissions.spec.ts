import { expect, test } from "@playwright/test";
import { loginBackoffice, loginCustomer } from "./helpers";

test.describe("autenticação e permissões", () => {
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
    expect([401, 403, 307, 302]).toContain(products.status());

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
    expect([401, 403, 307, 303, 302]).toContain(upload.status());
  });
});
