import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "料金プラン",
  description:
    "StockLensのスタンダードプラン（月額¥1,980）。CAN SLIM分析・AI定性レビュー・売りシグナル通知。30日間無料トライアル付き。",
  alternates: { canonical: "/pricing" },
};
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  return <PricingContent searchParams={searchParams} />;
}

async function PricingContent({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const canceled = params.checkout === "canceled";

  return (
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {canceled && (
          <div className="mx-auto mb-8 max-w-md rounded-lg border border-chart-4/30 bg-chart-4/5 px-4 py-3 text-center text-sm">
            <p className="font-medium">チェックアウトがキャンセルされました</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ご不明な点がございましたらお気軽にお問い合わせください
            </p>
          </div>
        )}

        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            シンプルな料金プラン
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            まずは30日間無料でお試しください
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-md">
          <Card className="relative overflow-hidden border-primary/30 bg-card/50 backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-2xl">スタンダードプラン</CardTitle>
              <CardDescription className="text-base">
                すべての分析機能にアクセス
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight">
                  ¥1,980
                </span>
                <span className="text-muted-foreground">/月（税込）</span>
              </div>
              <p className="mt-2 text-sm font-medium text-primary">
                30日間無料トライアル付き
              </p>
              <ul className="mt-8 space-y-3 text-left text-sm">
                {[
                  "CAN SLIM複合スコア分析",
                  "チャートパターン検出",
                  "AI定性分析レビュー",
                  "ポートフォリオ管理",
                  "売りシグナル通知",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-chart-3" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 w-full text-base font-semibold"
                )}
              >
                無料トライアルを始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                クレジットカード不要・いつでもキャンセル可能
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
