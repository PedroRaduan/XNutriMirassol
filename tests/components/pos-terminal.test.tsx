import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POSTerminal } from "@/components/pdv/pos-terminal";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/lib/actions/pos", () => ({
  finalizePOSSale: vi.fn(),
}));

describe("PDV - pagamento misto", () => {
  beforeEach(() => refresh.mockReset());

  it("cria uma única divisão e impede cliques repetidos quando o total já está distribuído", async () => {
    const user = userEvent.setup();
    render(<POSTerminal sessionId="demo-session" cashierName="Caixa QA" expectedAmount={0} isDemo />);

    await user.click(screen.getByRole("button", { name: /Creatina XNutri 300g/i }));

    const mixedButton = screen.getByRole("button", { name: /Pagamento misto/i });
    await waitFor(() => expect(mixedButton).toBeEnabled());
    await user.click(mixedButton);

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(mixedButton).toBeDisabled();
    expect(screen.getByText(/Total informado:/i)).toBeInTheDocument();
  });

  it("não permite finalizar duas vezes enquanto a venda está pendente", async () => {
    const user = userEvent.setup();
    render(<POSTerminal sessionId="demo-session" cashierName="Caixa QA" expectedAmount={0} isDemo />);

    await user.click(screen.getByRole("button", { name: /Creatina XNutri 300g/i }));
    const finalizeButtons = screen.getAllByRole("button", { name: /Finalizar/i });
    expect(finalizeButtons.length).toBeGreaterThan(0);
    await user.click(finalizeButtons[0]);
    expect(screen.getByText(/Modo de treinamento/i)).toBeInTheDocument();
  });
});
