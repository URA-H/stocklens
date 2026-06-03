import Link from "next/link";
import { BarChart3, ArrowRight, LogOut, Settings } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSubscriptionActive } from "@/lib/subscription";

export default async function ExpiredPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // If subscription is actually active, redirect to dashboard
  const { subscriptionStatus, trialEndsAt } = session.user;
  if (
    subscriptionStatus &&
    trialEndsAt &&
    isSubscriptionActive(subscriptionStatus, trialEndsAt)
  ) {
    redirect("/dashboard");
  }

  const isTrialExpired = subscriptionStatus === "trialing";
  const isCanceled = subscriptionStatus === "canceled";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <BarChart3 className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">StockLens</span>
      </div>

      <Card className="w-full max-w-md border-border/50 bg-card/50">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isTrialExpired
              ? "無料トライアルが終了しました"
              : isCanceled
                ? "サブスクリプションがキャンセルされました"
                : "サブスクリプションが無効です"}
          </CardTitle>
          <CardDescription className="text-base">
            {isTrialExpired
              ? "引き続きStockLensをご利用いただくには、プランへのご登録が必要です。"
              : "分析機能をご利用いただくには、プランの再開が必要です。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium">スタンダードプラン</p>
            <p className="mt-1 text-3xl font-bold">¥1,980</p>
            <p className="text-xs text-muted-foreground">/月（税込）</p>
          </div>

          <form
            action={async () => {
              "use server";
              const { auth: getSession } = await import("@/lib/auth");
              const sess = await getSession();
              if (!sess?.user?.id) return;

              const { prisma } = await import("@/lib/db");
              const { stripe, PLANS } = await import("@/lib/stripe");

              const user = await prisma.user.findUnique({
                where: { id: sess.user.id },
              });
              if (!user) return;

              let customerId = user.stripeCustomerId;
              if (!customerId) {
                const customer = await stripe.customers.create({
                  email: user.email,
                  metadata: { userId: user.id },
                });
                customerId = customer.id;
                await prisma.user.update({
                  where: { id: user.id },
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
                  success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
                  cancel_url: `${process.env.NEXTAUTH_URL}/expired`,
                });

              if (checkoutSession.url) {
                const { redirect: redir } = await import("next/navigation");
                redir(checkoutSession.url);
              }
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              プランに登録する
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "flex-1"
              )}
            >
              <Settings className="mr-1.5 h-4 w-4" />
              設定
            </Link>
            <form
              className="flex-1"
              action={async () => {
                "use server";
                await (await import("@/lib/auth")).signOut({ redirectTo: "/" });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                ログアウト
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
