import { NextResponse } from "next/server";
import { auth } from "@/auth";

function redirectWithinSite(request: Request, pathname: string, params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? forwardedProtocol
    : new URL(request.url).protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : request.url;
  const destination = new URL(pathname, origin);
  destination.search = search.toString();
  return NextResponse.redirect(destination);
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isPdvRoute = pathname.startsWith("/pdv");

  if ((!isAdminRoute && !isPdvRoute) || pathname === "/admin/login" || pathname === "/pdv/login") {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV !== "production" && request.cookies.get("xnutri_demo_admin")?.value === "1") {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    return redirectWithinSite(request, isPdvRoute ? "/pdv/login" : "/admin/login", {
      callbackUrl: pathname,
    });
  }

  if (request.auth.user.role !== "ADMIN") {
    return redirectWithinSite(request, isPdvRoute ? "/pdv/login" : "/admin/login", {
      error: "unauthorized",
    });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/pdv/:path*"],
};
