import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { quoteShipping } from "@/lib/shipping/quote";
import { shippingQuoteSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const ip = await getClientIp();
  const limited = rateLimit(`shipping:${ip}`, 30, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = shippingQuoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const quotes = await quoteShipping(parsed.data.zipCode, parsed.data.subtotal);
    return NextResponse.json({ quotes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível calcular o frete." },
      { status: 400 },
    );
  }
}
