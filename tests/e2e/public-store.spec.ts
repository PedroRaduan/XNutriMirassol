import { expect, test } from "@playwright/test";
import {
  addMainProductToCart,
  collectRuntimeErrors,
  queryTestDatabase,
} from "./helpers";

test.describe("loja pública", () => {
  test("home, catálogo, busca e página de produto carregam sem erro", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await page.goto("/");
    await expect(page).toHaveTitle(/XNutri/i);
    await expect(page.getByRole("link", { name: /Ver produtos/i }).first()).toBeVisible();

    await page.goto("/catalogo?q=Creatina");
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Creatina Monohidratada XNutri 300g/i }).first()).toBeVisible();

    await page.goto("/produto/whey-protein-isolado-xnutri-900g");
    await expect(page.getByRole("heading", { name: "Whey Protein Isolado XNutri 900g" })).toBeVisible();
    await expect(page.getByLabel("Opção")).toBeVisible();
    await expect(page.getByLabel("Quantidade do produto")).toHaveValue("1");
    expect(runtimeErrors).toEqual([]);
  });

  test("produto sem estoque some das vitrines e aparece somente na busca, por último", async ({ page }) => {
    const product = await queryTestDatabase<{ id: string; name: string }>(
      'SELECT id, name FROM "products" WHERE sku = $1',
      ["XN-WHEY-ISO-900"],
    );
    expect(product.rowCount).toBe(1);

    const inventory = await queryTestDatabase<{ id: string; quantity: number; reserved: number }>(
      'SELECT id, quantity, reserved FROM "inventory" WHERE "productId" = $1 ORDER BY id',
      [product.rows[0].id],
    );

    try {
      await queryTestDatabase(
        'UPDATE "inventory" SET quantity = 0, reserved = 0 WHERE "productId" = $1',
        [product.rows[0].id],
      );

      await page.goto("/");
      await expect(page.getByRole("link", { name: product.rows[0].name, exact: true })).toHaveCount(0);

      await page.goto("/catalogo");
      await expect(page.getByRole("link", { name: product.rows[0].name, exact: true })).toHaveCount(0);

      await page.goto("/catalogo?q=Whey");
      const productCards = page.locator("article.product-card");
      const count = await productCards.count();
      expect(count).toBeGreaterThan(1);
      await expect(productCards.nth(count - 1)).toContainText(product.rows[0].name);

      const outOfStockCard = productCards.filter({ hasText: product.rows[0].name });
      await expect(outOfStockCard).toHaveCount(1);
      await expect(outOfStockCard.getByText("Sem estoque", { exact: true })).toHaveClass(/stock-pill-out/);
    } finally {
      for (const item of inventory.rows) {
        await queryTestDatabase(
          'UPDATE "inventory" SET quantity = $1, reserved = $2 WHERE id = $3',
          [item.quantity, item.reserved, item.id],
        );
      }
    }
  });

  test("carrinho vazio, adição, quantidade, persistência, cupom e remoção", async ({ page }) => {
    await page.goto("/carrinho");
    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();

    await addMainProductToCart(page);
    await page.goto("/carrinho");
    await expect(page.getByRole("heading", { name: "Confira seu pedido" })).toBeVisible();

    await page.getByRole("button", { name: "Aumentar" }).click();
    await expect(page.getByRole("link", { name: "Carrinho" }).locator("span")).toHaveText("2");
    await page.getByRole("button", { name: "Aumentar" }).click();
    await page.getByRole("button", { name: "Aumentar" }).click();
    await expect(page.getByTestId("cart-item-quantity")).toHaveText("4");
    await expect(page.getByRole("link", { name: "Carrinho" }).locator("span")).toHaveText("4");
    await page.reload();
    await expect(page.getByRole("link", { name: "Carrinho" }).locator("span")).toHaveText("4");

    const couponInput = page.getByPlaceholder("BEMVINDO10");
    await couponInput.fill("NAOEXISTE");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByText("Cupom não encontrado.")).toBeVisible();

    await couponInput.fill("BEMVINDO10");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByText("Cupom aplicado ao resumo do pedido.")).toBeVisible();

    await page.getByLabel("Remover").click();
    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
  });

  test("CEP inválido é explicado e CEP válido retorna opções de frete", async ({ page }) => {
    await addMainProductToCart(page);
    await page.goto("/carrinho");

    const zipCode = page.getByLabel("CEP para calcular frete");
    await zipCode.fill("123");
    await page.getByRole("button", { name: "Calcular" }).click();
    await expect(page.getByText("Informe um CEP válido com 8 números.")).toBeVisible();

    await zipCode.fill("15130001");
    await page.getByRole("button", { name: "Calcular" }).click();
    await expect(page.getByRole("button", { name: /Frete Manual Mirassol e Região/i })).toBeVisible();
  });

  test("checkout preserva dados ao pressionar Enter, aponta erros e cria um único pedido", async ({ page }) => {
    const customerEmail = "checkout.qa@xnutri.test";
    await addMainProductToCart(page);
    await page.goto("/carrinho");
    await page.getByRole("button", { name: /XNutri Mirassol.*Sem cobrança de frete/i }).click();
    await page.getByRole("link", { name: "Ir para checkout" }).click();

    await expect(page.getByRole("radio", { name: /Retirar na loja/i })).toBeChecked();
    await page.getByLabel("Nome").fill("Cliente QA Checkout");
    await page.getByLabel("E-mail").fill("email-invalido");
    await page.getByRole("textbox", { name: "WhatsApp" }).fill("17999999999");
    await page.getByLabel("Nome").press("Enter");

    await expect(page.getByLabel("Nome")).toHaveValue("Cliente QA Checkout");
    await expect(page.getByRole("radio", { name: /Retirar na loja/i })).toBeChecked();

    await page.getByRole("button", { name: "Finalizar pedido" }).click();
    await expect(page.getByText("Revise os dados para finalizar:")).toBeVisible();
    await expect(page.getByText(/E-mail:/)).toBeVisible();
    await expect(page.getByLabel("Nome")).toHaveValue("Cliente QA Checkout");

    await page.getByLabel("E-mail").fill(customerEmail);
    await page.getByRole("checkbox", { name: /Política de Privacidade/i }).check();
    const finishButton = page.getByRole("button", { name: "Finalizar pedido" });
    await finishButton.evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(page).toHaveURL(/\/pedido\/XN/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Pedido XN/ })).toBeVisible();

    const orderNumber = page.url().split("/").pop();
    const orders = await queryTestDatabase<{ count: string; orderNumber: string }>(
      'SELECT COUNT(*)::text AS count, MAX("orderNumber") AS "orderNumber" FROM "orders" WHERE "customerEmail" = $1',
      [customerEmail],
    );
    expect(orders.rows[0]).toEqual({ count: "1", orderNumber });
  });

  test("produto sem estoque não pode ser adicionado", async ({ page }) => {
    const product = await queryTestDatabase<{ id: string; slug: string }>(
      'SELECT id, slug FROM "products" WHERE sku = $1',
      ["XN-ACESS-STRAP-PRO"],
    );
    expect(product.rowCount).toBe(1);
    await queryTestDatabase(
      'UPDATE "inventory" SET quantity = 0, reserved = 0 WHERE "productId" = $1',
      [product.rows[0].id],
    );

    await page.goto(`/produto/${product.rows[0].slug}`);
    const purchase = page.getByTestId("product-purchase");
    await expect(purchase.getByText("Sem estoque", { exact: true }).first()).toBeVisible();
    await expect(purchase.getByRole("button", { name: "Adicionar ao carrinho" })).toHaveCount(0);
  });
});
