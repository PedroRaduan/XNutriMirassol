import { expect, test } from "@playwright/test";
import {
  addMainProductToCart,
  expectNoDocumentOverflow,
  loginBackoffice,
} from "./helpers";

test.describe("responsividade sem rolagem lateral", () => {
  test("home, catálogo, produto, carrinho, checkout e login", async ({ page }) => {
    for (const path of ["/", "/catalogo", "/produto/whey-protein-isolado-xnutri-900g", "/login", "/cadastro"]) {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      await expectNoDocumentOverflow(page);
    }

    await addMainProductToCart(page);
    for (const path of ["/carrinho", "/checkout"]) {
      await page.goto(path);
      await expectNoDocumentOverflow(page);
    }
  });

  test("header mantém logo e controles utilizáveis abaixo de 380px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    const logo = page.getByRole("link", { name: "XNutri home" });
    await expect(logo).toBeVisible();
    const logoBox = await logo.boundingBox();
    expect(logoBox).not.toBeNull();
    expect(logoBox!.x).toBeGreaterThanOrEqual(0);
    expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(360);
    await expect(page.getByRole("button", { name: "Abrir menu de navegação" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Carrinho" })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test("admin e PDV permanecem dentro da viewport", async ({ page }) => {
    await loginBackoffice(page, "admin", "admin@xnutri.com.br", "Admin@12345");
    for (const path of ["/admin", "/admin/produtos", "/admin/pedidos"]) {
      await page.goto(path);
      await expectNoDocumentOverflow(page);
    }

    await page.goto("/pdv");
    await expect(page).not.toHaveURL(/\/pdv\/login/);
    await expectNoDocumentOverflow(page);
  });
});
