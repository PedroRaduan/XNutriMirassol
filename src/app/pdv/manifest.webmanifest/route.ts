import { NextResponse } from "next/server";
import { canAccessAdminModule, getCurrentAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Only authenticated staff with POS permission receives this manifest. The
 * installed PWA is only a launcher: every PDV page and API remains protected
 * by server-side authentication and RBAC.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  const isDemo = admin && "isDemo" in admin && admin.isDemo;

  if (!admin || isDemo || !canAccessAdminModule(admin.adminRole, "pos")) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  return NextResponse.json(
    {
      id: "/pdv",
      name: "PDV XNutri",
      short_name: "XNutri PDV",
      description: "Aplicativo privado do caixa da loja XNutri.",
      start_url: "/pdv",
      scope: "/pdv",
      display: "standalone",
      lang: "pt-BR",
      background_color: "#101115",
      theme_color: "#101115",
      icons: [
        {
          src: "/xnutri-pdv-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/xnutri-pdv-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      shortcuts: [
        {
          name: "Abrir caixa",
          short_name: "Caixa",
          url: "/pdv",
        },
        {
          name: "Relatórios do PDV",
          short_name: "Relatórios",
          url: "/pdv/relatorios",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
