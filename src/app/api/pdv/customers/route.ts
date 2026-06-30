import { NextResponse, type NextRequest } from "next/server";
import { requirePOS } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requirePOS();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const customers = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { document: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      document: true,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return NextResponse.json({ customers });
}
