import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ShippingEstimator } from "@/components/cart/shipping-estimator";
import { ProductPurchase } from "@/components/product/product-purchase";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { LoginForm } from "@/components/forms/login-form";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), shipping: vi.fn(), login: vi.fn(), admin: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/catalogo" }));
vi.mock("@/lib/http/fetch-with-timeout", () => ({ fetchWithTimeout: mocks.fetch }));
vi.mock("@/lib/actions/cart", () => ({ selectShipping: mocks.shipping }));
vi.mock("@/lib/actions/auth", () => ({ loginWithCredentials: mocks.login, loginAdminWithCredentials: mocks.login, loginWithGoogle: vi.fn() }));
vi.mock("@/lib/actions/admin", () => ({ runAdminAction: mocks.admin }));
vi.mock("@/components/product/add-to-cart", () => ({ AddToCartButton: () => <button>Adicionar</button> }));

beforeEach(() => vi.resetAllMocks());

it("descarta o frete de um CEP editado enquanto a consulta estava pendente", async () => {
  let resolve!: (response: Response) => void;
  mocks.fetch.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
  const user = userEvent.setup();
  render(<ShippingEstimator subtotal={100} />);
  const cep = screen.getByRole("textbox");
  await user.type(cep, "01001000{Enter}");
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  await user.clear(cep);
  await user.type(cep, "15000000");
  await act(async () => resolve(new Response(JSON.stringify({ quotes: [{ methodId: "old", name: "Frete antigo", price: 10 }] }))));
  expect(screen.queryByText("Frete antigo")).not.toBeInTheDocument();
  expect(mocks.shipping).not.toHaveBeenCalled();
});

it("confirma a seleção do frete", async () => {
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ quotes: [{ methodId: "shipping", name: "Entrega regional", price: 10 }] })));
  mocks.shipping.mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<ShippingEstimator subtotal={100} />);
  await user.type(screen.getByRole("textbox"), "01001000{Enter}");
  await user.click(await screen.findByRole("button", { name: /Entrega regional/ }));
  expect(await screen.findByRole("status")).toHaveTextContent("Frete selecionado");
});

it("escolhe uma variação disponível e respeita o limite de 99 itens", async () => {
  const user = userEvent.setup();
  render(<ProductPurchase productId="p" basePrice={10} variants={[
    { id: "empty", name: "Esgotado", sku: "E", inventory: { quantity: 5, reserved: 5 } },
    { id: "stock", name: "Disponível", sku: "D", inventory: { quantity: 150, reserved: 0 } },
  ]} />);
  expect(screen.getByRole("combobox")).toHaveValue("stock");
  const quantity = screen.getByRole("spinbutton");
  await user.clear(quantity);
  await user.type(quantity, "999");
  expect(quantity).toHaveValue(99);
  expect(screen.getByRole("button", { name: "Aumentar quantidade" })).toBeDisabled();
});

it("fecha o menu ao selecionar um filtro na mesma rota e ao pressionar Escape", async () => {
  const user = userEvent.setup();
  render(<MobileMenu><summary>Menu</summary><a href="#ofertas">Ofertas</a></MobileMenu>);
  const summary = screen.getByText("Menu");
  await user.click(summary);
  await user.click(screen.getByText("Ofertas"));
  expect(summary.parentElement).not.toHaveAttribute("open");
  await user.click(summary);
  fireEvent.keyDown(summary, { key: "Escape" });
  expect(summary.parentElement).not.toHaveAttribute("open");
});

it.each(["loja", "admin"])("valida login da %s sem enviar credenciais inválidas", async (area) => {
  const user = userEvent.setup();
  render(area === "loja" ? <LoginForm callbackUrl="/cliente" googleEnabled={false} /> : <AdminLoginForm />);
  await user.click(screen.getByRole("button", { name: /Entrar/ }));
  expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
  expect(mocks.login).not.toHaveBeenCalled();
  mocks.login.mockResolvedValue({ ok: false, message: "E-mail ou senha inválidos." });
  await user.type(screen.getByRole("textbox"), "teste@example.com");
  await user.type(screen.getByLabelText(/^Senha/), "senha1234");
  await user.click(screen.getByRole("button", { name: /Entrar/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
  expect(mocks.login).toHaveBeenCalledOnce();
});

it("preserva os campos administrativos após erro e limpa após sucesso quando solicitado", async () => {
  mocks.admin.mockResolvedValueOnce({ ok: false, message: "Revise os dados." }).mockResolvedValueOnce({ ok: true, message: "Salvo." });
  const user = userEvent.setup();
  render(<AdminActionForm actionName="upsertProduct" resetOnSuccess><input aria-label="Nome" name="name" /><button>Salvar</button></AdminActionForm>);
  await user.type(screen.getByRole("textbox"), "Produto preenchido");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Revise os dados.");
  expect(screen.getByRole("textbox")).toHaveValue("Produto preenchido");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
});

it("bloqueia reenvio administrativo enquanto salva", async () => {
  let resolve!: (state: { ok: boolean; message: string }) => void;
  mocks.admin.mockReturnValue(new Promise((done) => { resolve = done; }));
  const user = userEvent.setup();
  render(<AdminActionForm actionName="upsertProduct"><AdminSubmitButton>Salvar</AdminSubmitButton></AdminActionForm>);
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
  await act(async () => resolve({ ok: true, message: "Salvo." }));
});
