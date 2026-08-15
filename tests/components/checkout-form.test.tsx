import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutForm } from "@/components/checkout/checkout-form";

const fetchWithTimeoutMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/checkout", () => ({
  submitCheckout: vi.fn(async () => ({ ok: false, message: "" })),
}));

vi.mock("@/lib/actions/cart", () => ({
  selectPickup: vi.fn(async () => undefined),
  selectShipping: vi.fn(async () => undefined),
}));

vi.mock("@/lib/http/fetch-with-timeout", () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
}));

describe("Checkout - CEP e frete", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    fetchWithTimeoutMock.mockReset();
  });

  it("mantém o cálculo de frete ativo quando o CEP é formatado pelo preenchimento automático", async () => {
    fetchWithTimeoutMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/cep/")) {
        return Promise.resolve(new Response(JSON.stringify({
          zipCode: "01001-000",
          street: "Praça da Sé",
          district: "Sé",
          city: "São Paulo",
          state: "SP",
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }

      return new Promise<Response>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          resolve(new Response(JSON.stringify({
            quotes: [{
              methodId: "frete-regional",
              name: "Entrega regional",
              provider: "MANUAL",
              price: 14.9,
              deliveryDaysMin: 1,
              deliveryDaysMax: 2,
              description: "Entrega configurada para a região.",
            }],
          }), { status: 200, headers: { "Content-Type": "application/json" } }));
        }, 100);

        init?.signal?.addEventListener("abort", () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      });
    });

    const user = userEvent.setup();
    render(
      <CheckoutForm
        pickupOptions={[{ id: "loja", name: "XNutri Mirassol", instructions: "Retire com documento." }]}
        subtotal={100}
        total={100}
        shippingCost={0}
      />,
    );

    const cep = screen.getByLabelText("CEP");
    await user.type(cep, "01001000");

    await waitFor(() => expect(cep).toHaveValue("01001-000"), { timeout: 2_500 });
    await expect(screen.findByRole("button", { name: /Entrega regional/i }, { timeout: 2_500 })).resolves.toBeVisible();
    expect(screen.getByText("Fretes calculados. Escolha uma opção para continuar.")).toBeVisible();
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      "/api/shipping/quote",
      expect.objectContaining({ method: "POST" }),
      expect.any(Object),
    );
  });
});
