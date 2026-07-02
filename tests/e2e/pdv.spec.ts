import { expect, test } from "@playwright/test";
import { loginBackoffice, queryTestDatabase } from "./helpers";

test.describe("PDV", () => {
  test("abre caixa, busca por SKU, bloqueia pagamento misto repetido e finaliza venda", async ({ page }) => {
    await loginBackoffice(page, "pdv", "caixa@xnutri.com.br", "Caixa@12345");

    if (await page.getByRole("heading", { name: "Abrir caixa" }).isVisible()) {
      await page.getByLabel("Valor inicial").fill("100");
      await page.getByRole("button", { name: "Abrir caixa" }).click();
      await expect(page.getByRole("heading", { name: "Venda presencial" })).toBeVisible();
    }

    const search = page.getByPlaceholder("Escaneie ou digite...");
    await search.fill("XN-WHEY-ISO-900-1");
    await search.press("Enter");
    await expect(page.getByText(/Whey Protein Isolado XNutri 900g/i).first()).toBeVisible();
    await expect(page.getByText("1 item(ns) na venda")).toBeVisible();

    const mixed = page.getByRole("button", { name: "Pagamento misto" });
    await mixed.click();
    await expect(page.getByText("Pagamento misto criado. Ajuste os valores se precisar.")).toBeVisible();
    await expect(mixed).toBeDisabled();

    await page.getByRole("button", { name: "Finalizar venda" }).click();
    await expect(page.getByText("Venda finalizada.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir comprovante" })).toBeVisible();

    const sale = await queryTestDatabase<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM "pos_sales" WHERE status = $1',
      ["COMPLETED"],
    );
    expect(Number(sale.rows[0].count)).toBeGreaterThanOrEqual(1);
  });

  test("venda acima do estoque e desconto acima do total são limitados no cliente", async ({ page }) => {
    await loginBackoffice(page, "pdv", "caixa@xnutri.com.br", "Caixa@12345");
    if (await page.getByRole("heading", { name: "Abrir caixa" }).isVisible()) {
      await page.getByRole("button", { name: "Abrir caixa" }).click();
    }

    const search = page.getByPlaceholder("Escaneie ou digite...");
    await search.fill("XN-WHEY-ISO-900-2");
    await search.press("Enter");
    await expect(page.getByText("1 item(ns) na venda")).toBeVisible();

    const quantity = page.locator('input[value="1"]').first();
    await quantity.fill("9999");
    await expect(quantity).not.toHaveValue("9999");

    await page.getByLabel("Desconto geral").fill("999999");
    await expect(page.getByText("R$ 0,00", { exact: true }).last()).toBeVisible();
  });
});
