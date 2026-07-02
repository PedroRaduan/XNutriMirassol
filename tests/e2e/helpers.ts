import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/xnutri_test?schema=public";

export async function queryTestDatabase<T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    return await client.query<T>(text, values);
  } finally {
    await client.end();
  }
}

export async function loginBackoffice(
  page: Page,
  area: "admin" | "pdv",
  email: string,
  password: string,
) {
  await page.goto(`/${area}/login`);
  await page.getByLabel("E-mail administrativo").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: area === "admin" ? "Entrar no admin" : "Entrar no PDV" }).click();
  await page.waitForURL((url) => url.pathname === `/${area}`);
}

export async function loginCustomer(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("cliente@xnutri.com.br");
  await page.getByLabel("Senha").fill("Cliente@12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/cliente");
}

export async function addMainProductToCart(page: Page) {
  await page.goto("/produto/whey-protein-isolado-xnutri-900g");
  await expect(page.getByRole("heading", { name: "Whey Protein Isolado XNutri 900g" })).toBeVisible();
  const purchase = page.getByTestId("product-purchase");
  await purchase.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(purchase.getByRole("button", { name: "Adicionado" })).toBeVisible();
}

export async function expectNoDocumentOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > viewportWidth + 2 || rect.left < -2;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className?.toString().slice(0, 120) ?? "",
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));

    return {
      clientWidth: viewportWidth,
      scrollWidth: root.scrollWidth,
      offenders,
    };
  });

  expect(
    result.scrollWidth,
    `A página criou rolagem lateral. Elementos suspeitos: ${JSON.stringify(result.offenders)}`,
  ).toBeLessThanOrEqual(result.clientWidth + 2);
}

export function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500 && new URL(response.url()).origin === new URL(page.url() || "http://127.0.0.1:3100").origin) {
      errors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return errors;
}
