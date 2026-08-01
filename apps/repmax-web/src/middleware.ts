// ============================================================
// Protege rutas /dashboard/* comprobando cookie repmax_token
// (la validez del JWT la verifica el API Express)
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("repmax_token")?.value;
  if (!token || token.trim() === "") {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
