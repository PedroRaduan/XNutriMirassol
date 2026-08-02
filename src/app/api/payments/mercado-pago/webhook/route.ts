import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "A integração Mercado Pago foi desativada. Configure o webhook PagBank." },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json({ ok: false, service: "mercado-pago-retired" }, { status: 410 });
}
