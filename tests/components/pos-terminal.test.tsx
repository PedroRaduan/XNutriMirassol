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
  beforeEach(() => {
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

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

  it("filtra por categoria e mantém produtos e carrinho na mesma estação", async () => {
    const user = userEvent.setup();
    render(<POSTerminal sessionId="demo-session" cashierName="Caixa QA" expectedAmount={0} isDemo />);

    expect(document.querySelector('[data-pdv-panel="products"]')).toBeInTheDocument();
    expect(document.querySelector('[data-pdv-panel="cart"]')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Roupas Fitness" }));

    expect(screen.queryByRole("button", { name: /Creatina XNutri 300g/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Legging Compression XNutri/i })).toBeInTheDocument();
  });

  it("pede confirmação antes de limpar uma venda", async () => {
    const user = userEvent.setup();
    render(<POSTerminal sessionId="demo-session" cashierName="Caixa QA" expectedAmount={0} isDemo />);

    await user.click(screen.getByRole("button", { name: /Creatina XNutri 300g/i }));
    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByText("1 item(ns) na venda")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog", { name: "Limpar a venda atual?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Limpar venda" }));
    expect(screen.getByText("0 item(ns) na venda")).toBeInTheDocument();
    expect(screen.getByText(/Nenhum estoque foi alterado/i)).toBeInTheDocument();
  });

  it("mostra skeleton localizado enquanto os produtos carregam", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    render(<POSTerminal sessionId="session" cashierName="Caixa QA" expectedAmount={0} />);

    await waitFor(() => expect(document.querySelector('[data-pdv-skeleton="products"]')).toBeInTheDocument());
    expect(document.querySelector('[data-pdv-panel="cart"]')).toBeInTheDocument();
    expect(document.querySelector('[data-pdv-panel="payment"]')).toBeInTheDocument();
  });

  it("distingue falha de conexão de cliente inexistente", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("customers")) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({ products: [], exactCount: 0 }));
    }));
    const user = userEvent.setup();
    render(<POSTerminal sessionId="session" cashierName="Caixa QA" expectedAmount={0} />);
    await user.type(screen.getByRole("textbox", { name: /Buscar cliente por/ }), "Maria");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível buscar clientes");
    expect(screen.queryByText(/Nenhum cliente encontrado/)).not.toBeInTheDocument();
  });
});
