import { expect, test } from "@playwright/test";
import { loginBackoffice, queryTestDatabase } from "./helpers";

test.describe("painel administrativo", () => {
  test.beforeEach(async ({ page }) => {
    await loginBackoffice(page, "admin", "admin@xnutri.com.br", "Admin@12345");
  });

  test("dashboard e módulos principais carregam", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Painel da loja" })).toBeVisible();
    for (const [path, heading] of [
      ["/admin/produtos", "Produtos"],
      ["/admin/categorias", "Categorias"],
      ["/admin/estoque", "Estoque"],
      ["/admin/cupons", "Cupons"],
      ["/admin/pedidos", "Pedidos"],
      ["/admin/clientes", "Clientes"],
      ["/admin/relatorios", "Relatórios"],
      ["/admin/configuracoes", "Configurações"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("cria e edita produto, fecha o painel e registra auditoria", async ({ page }) => {
    await page.goto("/admin/produtos");
    const createDetails = page.locator("details").filter({ hasText: "Adicionar produto" }).first();
    await createDetails.locator("summary").click();
    const form = createDetails.locator("form").first();

    await form.getByLabel("Categoria").selectOption({ label: "Suplementos" });
    await form.getByLabel("Nome").fill("Produto QA Automatizado");
    await form.getByLabel("Descrição curta").fill("Produto criado pela bateria automatizada de qualidade.");
    await form.getByLabel("Descrição completa").fill("Cadastro isolado para validar produto, estoque, preço e auditoria no painel.");
    await form.getByLabel("Código/SKU").fill("QA-PRODUTO-001");
    await form.getByLabel("Preço", { exact: true }).fill("99.90");
    await form.getByLabel("Custo do produto").fill("45.00");
    await form.getByLabel("Estoque principal").fill("12");
    await form.getByLabel("Imagens").fill("https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=80");
    await form.getByRole("button", { name: "Cadastrar produto" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Produto salvo com sucesso." })).toBeVisible();
    await expect(createDetails).not.toHaveAttribute("open", "");

    await page.goto("/admin/produtos?q=QA-PRODUTO-001");
    const productCard = page.locator("article").filter({ hasText: "Produto QA Automatizado" });
    await expect(productCard).toBeVisible();
    const editDetails = productCard.locator("details").filter({ hasText: "Editar produto" });
    await editDetails.locator("summary").click();
    const editForm = editDetails.locator("form").first();
    await editForm.getByLabel("Preço", { exact: true }).fill("109.90");
    await editForm.getByRole("button", { name: "Salvar e fechar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Produto salvo com sucesso." })).toBeVisible();
    await expect(editDetails).not.toHaveAttribute("open", "");

    const databaseProduct = await queryTestDatabase<{ price: string; quantity: number }>(
      'SELECT p.price::text AS price, SUM(i.quantity)::int AS quantity FROM "products" p JOIN "inventory" i ON i."productId" = p.id WHERE p.sku = $1 GROUP BY p.id, p.price',
      ["QA-PRODUTO-001"],
    );
    expect(databaseProduct.rows[0]).toEqual({ price: "109.90", quantity: 12 });

    const audit = await queryTestDatabase<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM "audit_logs" WHERE entity = $1',
      ["products"],
    );
    expect(Number(audit.rows[0].count)).toBeGreaterThanOrEqual(2);
  });

  test("cria cupom e impede SKU duplicado com mensagem amigável", async ({ page }) => {
    await page.goto("/admin/cupons");
    const couponForm = page.locator("aside form").first();
    await couponForm.getByPlaceholder("XNUTRI10").fill("QA15");
    await couponForm.locator('select[name="type"]').selectOption("PERCENTAGE");
    await couponForm.getByPlaceholder("Descrição interna").fill("Cupom da bateria QA");
    await couponForm.getByPlaceholder("Valor").fill("15");
    await couponForm.getByRole("button", { name: "Criar cupom" }).click();
    await expect(couponForm.getByRole("status")).toContainText("Cupom salvo com sucesso.");

    await page.goto("/admin/produtos");
    const createDetails = page.locator("details").filter({ hasText: "Adicionar produto" }).first();
    await createDetails.locator("summary").click();
    const form = createDetails.locator("form").first();
    await form.getByLabel("Categoria").selectOption({ label: "Suplementos" });
    await form.getByLabel("Nome").fill("Produto com SKU repetido");
    await form.getByLabel("Descrição curta").fill("Validação de duplicidade.");
    await form.getByLabel("Descrição completa").fill("Esse cadastro deve ser rejeitado sem expor erro técnico.");
    await form.getByLabel("Código/SKU").fill("XN-WHEY-ISO-900");
    await form.getByLabel("Preço", { exact: true }).fill("10");
    await form.getByLabel("Estoque principal").fill("1");
    await form.getByLabel("Imagens").fill("https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=80");
    await form.getByRole("button", { name: "Cadastrar produto" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await expect(form.getByRole("alert")).not.toContainText(/Prisma|Unique constraint|stack/i);
  });
});
