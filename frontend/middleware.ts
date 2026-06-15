import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes
const KOC_ROUTES = ["/portal"];
const MERCHANT_ROUTES = ["/dashboard"];
const ADMIN_ROUTES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // We use client-side auth check via localStorage token
  // This middleware just ensures the pages load; auth is checked client-side
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/dashboard/:path*", "/admin/:path*"],
};
