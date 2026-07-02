import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        database: "connected",
        service: "xnutri",
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    console.error("[health] Banco de dados indisponível.");

    return Response.json(
      {
        status: "degraded",
        database: "unavailable",
        service: "xnutri",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
