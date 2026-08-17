import { expect, test } from "@playwright/test";
import {
  addMainProductToCart,
  expectNoDocumentOverflow,
  loginBackoffice,
} from "./helpers";

test.describe("responsividade sem rolagem lateral", () => {
  test("home mobile mostra atalhos e produtos sem hero excessivo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const hero = page.locator('[data-home-section="hero"]');
    const quickLinks = page.locator('[data-home-section="quick-links"] a');
    const firstProduct = page.locator('[data-home-section="featured"] .product-card').first();

    await expect(hero).toBeVisible();
    await expect(quickLinks).toHaveCount(4);
    await expect(firstProduct).toBeVisible();

    const heroBox = await hero.boundingBox();
    const productBox = await firstProduct.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(productBox).not.toBeNull();
    expect(heroBox!.height).toBeLessThan(280);
    expect(productBox!.y).toBeLessThan(760);
    await expectNoDocumentOverflow(page);
  });

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
    await expect(page.locator('summary[aria-label="Abrir menu de navegação"]')).toBeVisible();
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

  test("PDV mantém toda a operação principal visível no notebook e desktop sem scroll da página", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Validação específica do desktop compacto.");
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginBackoffice(page, "pdv", "caixa@xnutri.com.br", "Caixa@12345");

    if (await page.getByRole("heading", { name: "Abrir caixa" }).isVisible()) {
      await page.getByRole("button", { name: "Abrir caixa" }).click();
    }

    for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(viewport);
      const workspace = page.locator("[data-pdv-sale-workspace]");
      await expect(workspace).toBeVisible();
      for (const panel of ["products", "cart", "customer", "payment", "summary"]) {
        await expect(page.locator(`[data-pdv-panel="${panel}"]`)).toBeInViewport();
      }
      await expect(page.locator("[data-pdv-finalize]")).toBeInViewport();

      const dimensions = await page.evaluate(() => {
        const element = document.querySelector("[data-pdv-sale-workspace]");
        const bounds = element?.getBoundingClientRect();
        return {
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          workspaceTop: bounds?.top ?? -1,
          workspaceBottom: bounds?.bottom ?? Number.POSITIVE_INFINITY,
        };
      });

      expect(dimensions.workspaceTop).toBeGreaterThanOrEqual(0);
      expect(dimensions.workspaceBottom).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
      expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
    }
  });
});
