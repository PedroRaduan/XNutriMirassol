import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * The manifest is intentionally served only to the store owner. A manifest or
 * a service worker is not an access-control boundary; all admin routes still
 * perform their usual authentication and role checks on the server.
 */
export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin || admin.adminRole !== "ADMIN") {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  return NextResponse.json(
    {
      id: "/admin",
      name: "Painel XNutri",
      short_name: "XNutri Admin",
      description: "Painel administrativo privado da XNutri.",
      start_url: "/admin",
      scope: "/admin/",
      display: "standalone",
      background_color: "#f5f6f8",
      theme_color: "#d6332c",
      icons: [
        {
          src: "/xnutri-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
