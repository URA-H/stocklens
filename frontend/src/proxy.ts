import { auth } from "@/lib/auth";
import { isSubscriptionActive } from "@/lib/subscription";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/terms",
  "/privacy",
  "/tokushoho",
  "/api/auth",
  "/api/stripe/webhook",
];

/** Paths accessible to authenticated but expired users */
const expiredAllowedPaths = [
  "/expired",
  "/settings",
  "/api/stripe/checkout",
  "/api/stripe/portal",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

function isExpiredAllowedPath(pathname: string): boolean {
  return expiredAllowedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check subscription status for protected routes
  if (!isExpiredAllowedPath(pathname)) {
    const { subscriptionStatus, trialEndsAt } = session.user;
    if (
      subscriptionStatus &&
      trialEndsAt &&
      !isSubscriptionActive(subscriptionStatus, trialEndsAt)
    ) {
      return NextResponse.redirect(new URL("/expired", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
