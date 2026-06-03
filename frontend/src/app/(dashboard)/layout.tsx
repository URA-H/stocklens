import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  LayoutDashboard,
  Briefcase,
  Star,
  Settings,
  LogOut,
} from "lucide-react";
import { auth, signOut } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { stripe, PLANS } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await getUser(session.user.id);
  if (!user) redirect("/login");

  const isTrialing = user.subscriptionStatus === "trialing";
  const trialDaysLeft = isTrialing
    ? Math.max(
        0,
        Math.ceil(
          (user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const isExpired =
    user.subscriptionStatus === "expired" ||
    (isTrialing && user.trialEndsAt < new Date());

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/50 bg-card/30 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">StockLens</span>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <LayoutDashboard className="h-4 w-4" />
              ダッシュボード
            </Link>
            <Link
              href="/portfolio"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Briefcase className="h-4 w-4" />
              ポートフォリオ
            </Link>
            <Link
              href="/watchlist"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Star className="h-4 w-4" />
              ウォッチリスト
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              設定
            </Link>
          </nav>
          <div className="border-t border-border/50 p-4">
            <div className="mb-3 truncate text-sm">
              <p className="font-medium">{user.name || "ユーザー"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col pb-16 lg:pb-0">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 px-4 sm:px-6 lg:h-16">
          <div className="flex items-center gap-3 lg:hidden">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold">StockLens</span>
          </div>
          <div className="hidden lg:block" />
          <div className="ml-auto flex items-center gap-3">
            {isTrialing && trialDaysLeft > 0 && (
              <Badge
                variant="outline"
                className="border-primary/30 text-primary"
              >
                トライアル残り{trialDaysLeft}日
              </Badge>
            )}
            {isExpired && (
              <form
                action={async () => {
                  "use server";
                  const session = await (
                    await import("@/lib/auth")
                  ).auth();
                  if (!session?.user?.id) return;

                  const { prisma: db } = await import("@/lib/db");
                  const u = await db.user.findUnique({
                    where: { id: session.user.id },
                  });
                  if (!u) return;

                  let customerId = u.stripeCustomerId;
                  if (!customerId) {
                    const customer = await stripe.customers.create({
                      email: u.email,
                      metadata: { userId: u.id },
                    });
                    customerId = customer.id;
                    await db.user.update({
                      where: { id: u.id },
                      data: { stripeCustomerId: customerId },
                    });
                  }

                  const checkoutSession =
                    await stripe.checkout.sessions.create({
                      customer: customerId,
                      mode: "subscription",
                      payment_method_types: ["card"],
                      line_items: [
                        { price: PLANS.monthly.priceId, quantity: 1 },
                      ],
                      subscription_data: { trial_period_days: 30 },
                      payment_method_collection: "if_required",
                      success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
                      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=canceled`,
                    });

                  if (checkoutSession.url) {
                    const { redirect: redir } = await import(
                      "next/navigation"
                    );
                    redir(checkoutSession.url);
                  }
                }}
              >
                <Button type="submit" variant="destructive" size="sm">
                  プランをアップグレード
                </Button>
              </form>
            )}
            {/* Mobile logout */}
            <form
              className="lg:hidden"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-foreground"
        >
          <LayoutDashboard className="h-5 w-5" />
          ホーム
        </Link>
        <Link
          href="/portfolio"
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground"
        >
          <Briefcase className="h-5 w-5" />
          ポートフォリオ
        </Link>
        <Link
          href="/settings"
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground"
        >
          <Settings className="h-5 w-5" />
          設定
        </Link>
      </nav>
    </div>
  );
}
