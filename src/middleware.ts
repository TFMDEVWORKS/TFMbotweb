
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const cookieName = isAdminRoute ? "mall_admin_session" : "mall_session";
  const loginPath = isAdminRoute ? "/admin/login" : "/merchant/login";

  const token = request.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
}

export const config = {
  matcher: [
    "/merchant/dashboard/:path*",
    "/merchant/products/:path*",
    "/merchant/orders/:path*",
  ],
};
