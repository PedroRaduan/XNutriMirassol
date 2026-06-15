import { NextResponse } from "next/server";
import { syncMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";

export async function POST(request: Request) {
  const ip = await getClientIp();
  const limited = rateLimit(`mp-webhook:${ip}`, 120, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const paymentId = String(body?.data?.id ?? url.searchParams.get("id") ?? "");
  const topic = String(body?.type ?? url.searchParams.get("topic") ?? "");

  if (!paymentId || (topic && !topic.includes("payment"))) {
    return NextResponse.json({ received: true });
  }

  await syncMercadoPagoPayment(paymentId);
  return NextResponse.json({ received: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = String(url.searchParams.get("id") ?? url.searchParams.get("data.id") ?? "");

  if (paymentId) {
    await syncMercadoPagoPayment(paymentId);
  }

  return NextResponse.json({ received: true });
}
