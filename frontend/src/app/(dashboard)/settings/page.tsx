import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

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

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await getUser(session.user.id);
  if (!user) redirect("/login");

  const statusLabel: Record<string, string> = {
    active: "有効",
    trialing: "トライアル中",
    expired: "期限切れ",
    canceled: "キャンセル済み",
    past_due: "支払い遅延",
  };

  const trialDaysLeft =
    user.subscriptionStatus === "trialing"
      ? Math.max(
          0,
          Math.ceil(
            (user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground">アカウントとサブスクリプションの管理</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>アカウント情報</CardTitle>
            <CardDescription>登録情報の確認</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">名前</p>
              <p className="text-sm font-medium">{user.name || "未設定"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">メールアドレス</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>サブスクリプション</CardTitle>
            <CardDescription>現在のプラン情報</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">ステータス</p>
              <Badge
                variant="outline"
                className={
                  user.subscriptionStatus === "active"
                    ? "border-chart-3/30 text-chart-3"
                    : user.subscriptionStatus === "trialing"
                      ? "border-primary/30 text-primary"
                      : "border-destructive/30 text-destructive"
                }
              >
                {statusLabel[user.subscriptionStatus] || user.subscriptionStatus}
              </Badge>
            </div>
            {trialDaysLeft !== null && (
              <p className="text-sm text-muted-foreground">
                トライアル残り{trialDaysLeft}日
              </p>
            )}
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
                if (!u?.stripeCustomerId) return;

                const portalSession =
                  await stripe.billingPortal.sessions.create({
                    customer: u.stripeCustomerId,
                    return_url: `${process.env.NEXTAUTH_URL}/settings`,
                  });

                if (portalSession.url) {
                  const { redirect: redir } = await import(
                    "next/navigation"
                  );
                  redir(portalSession.url);
                }
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Stripeで管理
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
