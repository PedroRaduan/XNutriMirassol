import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { quoteShipping } from "@/lib/shipping/quote";
import { shippingQuoteSchema } from "@/lib/validations";
import { getCartForDisplay } from "@/lib/ecommerce/cart";

export async function POST(request: Request) {
  const ip = await getClientIp();
  const limited = rateLimit(`shipping:${ip}`, 30, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = shippingQuoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Informe um CEP válido para calcular o frete." }, { status: 400 });
  }

  try {
    const cart = await getCartForDisplay();
    const quotes = await quoteShipping(parsed.data.zipCode, cart.subtotal);
    return NextResponse.json({ quotes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeMessage = /cep|entrega|frete/i.test(message)
      ? message
      : "Não foi possível calcular o frete agora. Tente novamente em instantes.";
    return NextResponse.json(
      { error: safeMessage },
      { status: 400 },
    );
  }
}
