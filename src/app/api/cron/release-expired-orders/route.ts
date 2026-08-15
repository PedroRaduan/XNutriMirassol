import { NextResponse } from "next/server";
import { releaseExpiredOrders } from "@/lib/ecommerce/expired-orders";

export const runtime = "nodejs";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Vercel Cron: releases stock held by checkout sessions that were never paid. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return NextResponse.json(await releaseExpiredOrders({ batchSize: 100, source: "cron" }));
}
