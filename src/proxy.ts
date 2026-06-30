import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
    const loginUrl = new URL(isPdvRoute ? "/pdv/login" : "/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.auth.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL(isPdvRoute ? "/pdv/login?error=unauthorized" : "/admin/login?error=unauthorized", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/pdv/:path*"],
};
