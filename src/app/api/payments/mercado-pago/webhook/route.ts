import { NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
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
  const paymentId = String(url.searchParams.get("data.id") ?? body?.data?.id ?? url.searchParams.get("id") ?? "");
  const topic = String(body?.type ?? url.searchParams.get("topic") ?? "");

  if (!/^\d{1,30}$/.test(paymentId) || (topic && topic !== "payment")) {
    return NextResponse.json({ received: true });
  }

  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!webhookSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Webhook do Mercado Pago não configurado." }, { status: 503 });
  }

  if (webhookSecret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId: paymentId,
        secret: webhookSecret,
        toleranceSeconds: 300,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
      }
      throw error;
    }
  }

  try {
    await syncMercadoPagoPayment(paymentId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Falha ao sincronizar pagamento do Mercado Pago", {
      paymentId,
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json({ error: "Não foi possível processar a notificação." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "mercado-pago-webhook" });
}
