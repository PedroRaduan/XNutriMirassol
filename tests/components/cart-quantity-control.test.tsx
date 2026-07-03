import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartQuantityControl } from "@/components/cart/cart-quantity-control";

const { refreshMock, updateCartItemMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  updateCartItemMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/lib/actions/cart", () => ({
  updateCartItem: updateCartItemMock,
}));

describe("carrinho - controle de quantidade", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    updateCartItemMock.mockReset();
  });

  it("mostra os cliques imediatamente e salva a quantidade mais recente em sequência", async () => {
    const user = userEvent.setup();
    let finishFirstRequest!: (value: { ok: boolean; message: string }) => void;
    const firstRequest = new Promise<{ ok: boolean; message: string }>((resolve) => {
      finishFirstRequest = resolve;
    });

    updateCartItemMock
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValue({ ok: true, message: "Quantidade atualizada." });

    render(
      <CartQuantityControl
        cartId="cart-1"
        itemId="item-1"
        initialQuantity={1}
        availableStock={10}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aumentar" }));
    await user.click(screen.getByRole("button", { name: "Aumentar" }));

    expect(screen.getByTestId("cart-item-quantity")).toHaveTextContent("3");
    expect(updateCartItemMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishFirstRequest({ ok: true, message: "Quantidade atualizada." });
    });

    await waitFor(() => expect(updateCartItemMock).toHaveBeenCalledTimes(2));
    const lastFormData = updateCartItemMock.mock.calls[1][0] as FormData;
    expect(lastFormData.get("quantity")).toBe("3");
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("restaura a quantidade anterior e explica quando a atualização falha", async () => {
    const user = userEvent.setup();
    updateCartItemMock.mockResolvedValue({ ok: false, message: "Estoque insuficiente." });

    render(
      <CartQuantityControl
        cartId="cart-1"
        itemId="item-1"
        initialQuantity={1}
        availableStock={10}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aumentar" }));

    await waitFor(() => expect(screen.getByText("Estoque insuficiente.")).toBeVisible());
    expect(screen.getByTestId("cart-item-quantity")).toHaveTextContent("1");
  });
});
