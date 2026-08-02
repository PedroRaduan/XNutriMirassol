import { NextResponse } from "next/server";
import { syncPagBankWebhook, validatePagBankWebhookSignature } from "@/lib/payments/pagbank";
import { getClientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
const maxBodySize = 128 * 1024;

export async function POST(request: Request) {
  const ip = await getClientIp();
  if (!rateLimit(`pagbank-webhook:${ip}`, 120, 60_000).ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBodySize) {
    return NextResponse.json({ error: "Notificação muito grande." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length === 0 || rawBody.length > maxBodySize) {
    return NextResponse.json({ error: "Notificação inválida." }, { status: 400 });
  }

  if (!validatePagBankWebhookSignature(rawBody, request.headers.get("x-authenticity-token"))) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  const payload = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Notificação inválida." }, { status: 400 });
  }

  try {
    await syncPagBankWebhook(payload);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Falha ao sincronizar pagamento PagBank", {
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json({ error: "Não foi possível processar a notificação." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "pagbank-webhook" });
}
