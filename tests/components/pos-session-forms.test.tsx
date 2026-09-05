import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { POSCashMovementForm, POSCloseSessionForm } from "@/components/pdv/pos-session-forms";

const mocks = vi.hoisted(() => ({ movement: vi.fn(), close: vi.fn() }));
vi.mock("@/lib/actions/pos", () => ({ createCashMovement: mocks.movement, closePOSSession: mocks.close, openPOSSession: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it("impede fechar o caixa com contagem vazia, mas aceita zero explícito", async () => {
  mocks.close.mockResolvedValue({ ok: false, message: "Confira o caixa." });
  const user = userEvent.setup();
  render(<POSCloseSessionForm sessionId="s" expectedAmount={100} />);
  await user.click(screen.getByRole("button", { name: "Fechar caixa" }));
  expect(mocks.close).not.toHaveBeenCalled();
  await user.type(screen.getByRole("spinbutton"), "0");
  await user.click(screen.getByRole("button", { name: "Fechar caixa" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Confira o caixa.");
  expect(mocks.close).toHaveBeenCalledOnce();
  expect(screen.getByRole("spinbutton")).toHaveValue(0);
});

it("mantém valor e motivo no erro e limpa somente ao registrar a movimentação", async () => {
  mocks.movement.mockResolvedValueOnce({ ok: false, message: "Tente novamente." }).mockResolvedValueOnce({ ok: true, message: "Registrado." });
  const user = userEvent.setup();
  render(<POSCashMovementForm sessionId="s" />);
  await user.type(screen.getByRole("spinbutton"), "50");
  await user.type(screen.getByRole("textbox", { name: "Motivo" }), "Reforço de troco");
  await user.click(screen.getByRole("button", { name: "Registrar movimentação" }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  expect(screen.getByRole("spinbutton")).toHaveValue(50);
  expect(screen.getByRole("textbox")).toHaveValue("Reforço de troco");
  await user.click(screen.getByRole("button", { name: "Registrar movimentação" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  expect(screen.getByRole("status")).toHaveTextContent("Registrado.");
});
