import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "A integração Mercado Pago foi substituída pelo PagBank. Gere um novo checkout." },
    { status: 410 },
  );
}
