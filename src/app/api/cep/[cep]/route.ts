import { NextResponse } from "next/server";
import { lookupCep } from "@/lib/shipping/cep";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";

export async function GET(_: Request, { params }: { params: Promise<{ cep: string }> }) {
  const ip = await getClientIp();
  const limited = rateLimit(`cep:${ip}`, 40, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const { cep } = await params;
  const address = await lookupCep(cep);

  if (!address) {
    return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
  }

  return NextResponse.json(address);
}
