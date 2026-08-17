import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/state-panel";

describe("estados compartilhados da interface", () => {
  it("anuncia o carregamento sem expor os blocos decorativos ao leitor de tela", () => {
    render(
      <LoadingRegion label="Carregando produtos">
        <Skeleton data-testid="skeleton" className="h-8" />
      </LoadingRegion>,
    );

    const region = screen.getByRole("status", { name: "Carregando produtos" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  it("anuncia erros e mantém a ação de recuperação acessível", () => {
    render(
      <StatePanel
        variant="error"
        title="Falha ao carregar"
        description="Tente novamente."
        action={<button type="button">Tentar novamente</button>}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao carregar");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
  });
});
