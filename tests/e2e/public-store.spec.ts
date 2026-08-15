import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  addMainProductToCart,
  collectRuntimeErrors,
  loginCustomer,
  queryTestDatabase,
} from "./helpers";

async function createPendingPickupOrder(page: Page, email: string, coupon?: string) {
  await addMainProductToCart(page);
  await page.goto("/carrinho");
  if (coupon) {
    await page.getByPlaceholder("BEMVINDO10").fill(coupon);
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByText("Cupom aplicado ao resumo do pedido.")).toBeVisible();
  }
  await page.getByRole("button", { name: /XNutri Mirassol.*Sem cobrança de frete/i }).click();
  await page.getByRole("link", { name: "Ir para checkout" }).click();
  await page.getByLabel("Nome").fill("Cliente QA Segurança");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("17999999999");
  await page.getByRole("checkbox", { name: /Política de Privacidade/i }).check();
  await page.getByRole("button", { name: "Finalizar pedido" }).click();
  await expect(page).toHaveURL(/\/pedido\/XN/, { timeout: 20_000 });
  return new URL(page.url()).pathname.split("/").pop()!;
}

test.describe("loja pública", () => {
  test("home, catálogo, busca e página de produto carregam sem erro", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await page.goto("/");
    await expect(page).toHaveTitle(/XNutri/i);
    await expect(page.getByRole("link", { name: /Ver produtos/i }).first()).toBeVisible();

    await page.goto("/catalogo?q=Creatina");
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Creatina Monohidratada XNutri 300g/i }).first()).toBeVisible();
    const productCard = page.locator("article.product-card").filter({ hasText: "Creatina Monohidratada XNutri 300g" }).first();
    await expect(productCard.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
    await expect(productCard.getByRole("button", { name: "Comprar agora" })).toBeVisible();
    await expect(productCard.getByRole("link", { name: /Ver detalhes/i })).toHaveCount(0);

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
    await expect(page.getByRole("heading", { name: "Seu carrinho" })).toBeVisible();

    await page.getByRole("button", { name: "Aumentar" }).click();
    await expect(page.getByTestId("cart-count")).toHaveText("2");
    await page.getByRole("button", { name: "Aumentar" }).click();
    await page.getByRole("button", { name: "Aumentar" }).click();
    await expect(page.getByTestId("cart-item-quantity")).toHaveText("4");
    await expect(page.getByTestId("cart-count")).toHaveText("4");
    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText("4");

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

    const orderNumber = new URL(page.url()).pathname.split("/").pop();
    const orders = await queryTestDatabase<{ count: string; orderNumber: string }>(
      'SELECT COUNT(*)::text AS count, MAX("orderNumber") AS "orderNumber" FROM "orders" WHERE "customerEmail" = $1',
      [customerEmail],
    );
    expect(orders.rows[0]).toEqual({ count: "1", orderNumber });

    const reservations = await queryTestDatabase<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM "inventory_movements" movement
       INNER JOIN "orders" orders ON orders.id = movement."orderId"
       WHERE orders."customerEmail" = $1 AND movement.type = 'RESERVATION'`,
      [customerEmail],
    );
    expect(reservations.rows[0].count).toBe("1");
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

  test("cron expira reserva e libera o limite do cupom de forma idempotente", async ({ page }) => {
    const couponBefore = await queryTestDatabase<{ usageCount: number }>(
      'SELECT "usageCount" FROM "coupons" WHERE code = $1',
      ["BEMVINDO10"],
    );
    const orderNumber = await createPendingPickupOrder(page, "cupom-expirado.qa@xnutri.test", "BEMVINDO10");
    const couponDuring = await queryTestDatabase<{ usageCount: number }>(
      'SELECT "usageCount" FROM "coupons" WHERE code = $1',
      ["BEMVINDO10"],
    );
    expect(couponDuring.rows[0].usageCount).toBe(couponBefore.rows[0].usageCount + 1);

    await queryTestDatabase(
      'UPDATE "orders" SET "createdAt" = NOW() - INTERVAL \'40 minutes\' WHERE "orderNumber" = $1',
      [orderNumber],
    );

    const unauthorized = await page.request.get("/api/cron/release-expired-orders");
    expect(unauthorized.status()).toBe(401);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await page.request.get("/api/cron/release-expired-orders", {
        headers: { authorization: "Bearer xnutri-e2e-cron-secret-with-at-least-32-characters" },
      });
      expect(response.ok()).toBeTruthy();
    }

    const state = await queryTestDatabase<{ status: string; released: boolean; usageCount: number }>(
      `SELECT orders.status,
              (orders."couponUsageReleasedAt" IS NOT NULL) AS released,
              coupons."usageCount"
       FROM "orders" orders
       JOIN "coupons" coupons ON coupons.id = orders."couponId"
       WHERE orders."orderNumber" = $1`,
      [orderNumber],
    );
    expect(state.rows[0]).toEqual({
      status: "CANCELED",
      released: true,
      usageCount: couponBefore.rows[0].usageCount,
    });
  });

  test("webhook PagBank rejeita fraude, confirma uma vez e ignora regressão", async ({ page }) => {
    const orderNumber = await createPendingPickupOrder(page, "webhook.qa@xnutri.test");
    const order = await queryTestDatabase<{ totalCents: number }>(
      'SELECT ROUND(total * 100)::int AS "totalCents" FROM "orders" WHERE "orderNumber" = $1',
      [orderNumber],
    );
    const token = "xnutri-e2e-webhook-token";
    const sign = (body: string) => createHash("sha256").update(`${token}-${body}`, "utf8").digest("hex");
    const payload = (status: string, value = order.rows[0].totalCents) => JSON.stringify({
      reference_id: orderNumber,
      charges: [{
        id: `CHAR_QA${orderNumber.slice(2)}`,
        status,
        amount: { value, currency: "BRL" },
        payment_method: { type: "PIX" },
      }],
    });

    const paidBody = payload("PAID");
    const unsigned = await page.request.post("/api/payments/pagbank/webhook", {
      data: paidBody,
      headers: { "content-type": "application/json", "x-authenticity-token": "0".repeat(64) },
    });
    expect(unsigned.status()).toBe(401);

    const wrongValueBody = payload("PAID", order.rows[0].totalCents - 100);
    const wrongValue = await page.request.post("/api/payments/pagbank/webhook", {
      data: wrongValueBody,
      headers: { "content-type": "application/json", "x-authenticity-token": sign(wrongValueBody) },
    });
    expect(wrongValue.status()).toBe(500);

    const missingChargeBody = JSON.stringify({ reference_id: orderNumber, status: "PAID" });
    const missingCharge = await page.request.post("/api/payments/pagbank/webhook", {
      data: missingChargeBody,
      headers: { "content-type": "application/json", "x-authenticity-token": sign(missingChargeBody) },
    });
    expect(missingCharge.status()).toBe(500);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const approved = await page.request.post("/api/payments/pagbank/webhook", {
        data: paidBody,
        headers: { "content-type": "application/json", "x-authenticity-token": sign(paidBody) },
      });
      expect(approved.ok()).toBeTruthy();
    }

    const pendingBody = payload("WAITING");
    const delayedPending = await page.request.post("/api/payments/pagbank/webhook", {
      data: pendingBody,
      headers: { "content-type": "application/json", "x-authenticity-token": sign(pendingBody) },
    });
    expect(delayedPending.ok()).toBeTruthy();

    const state = await queryTestDatabase<{ orderStatus: string; paymentStatus: string; stockOuts: string }>(
      `SELECT orders.status AS "orderStatus", payments.status AS "paymentStatus",
              COUNT(movements.id) FILTER (WHERE movements.type = 'STOCK_OUT')::text AS "stockOuts"
       FROM "orders" orders
       JOIN "payments" payments ON payments."orderId" = orders.id
       LEFT JOIN "inventory_movements" movements ON movements."orderId" = orders.id
       WHERE orders."orderNumber" = $1
       GROUP BY orders.status, payments.status`,
      [orderNumber],
    );
    expect(state.rows[0]).toEqual({ orderStatus: "AWAITING_PICKUP", paymentStatus: "APPROVED", stockOuts: "1" });
  });

  test("cliente autenticado pode retomar o PagBank sem token de visitante", async ({ page }) => {
    await loginCustomer(page);
    const orderNumber = await createPendingPickupOrder(page, "cliente@xnutri.com.br");

    const response = await page.request.post("/api/payments/pagbank/checkout", {
      data: { orderNumber },
    });

    // O ambiente E2E não possui credencial externa. Chegar ao erro controlado do
    // gateway confirma que a autorização do proprietário passou sem guest token.
    expect(response.status()).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Não foi possível abrir o pagamento agora. Tente novamente em instantes.",
    });
  });
});
