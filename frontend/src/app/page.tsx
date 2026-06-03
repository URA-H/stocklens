import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              StockLens
            </span>
          </Link>
          <div className="hidden items-center gap-8 sm:flex">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              機能
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              料金
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ログイン
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
              無料で始める
            </Link>
          </div>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "sm" }), "sm:hidden")}
          >
            無料で始める
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Gradient Orbs */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="pointer-events-none absolute top-20 right-0 h-[300px] w-[400px] rounded-full bg-accent/8 blur-[100px]" />

          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:pt-40">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <Zap className="h-3.5 w-3.5" />
                30日間無料トライアル
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                データ分析で
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  注目銘柄
                </span>
                を発見
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                ファンダメンタル・テクニカル・センチメントの複合分析で、
                日本株の銘柄をスコアリング。データに基づいた投資判断をサポートします。
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full sm:w-auto px-8 text-base font-semibold"
                  )}
                >
                  無料で始める
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="#features"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full sm:w-auto px-8 text-base"
                  )}
                >
                  機能を見る
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                クレジットカード不要 ・ 30日間すべての機能が無料
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-border/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                3つの分析軸で銘柄を評価
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                複数のデータソースを組み合わせ、独自のスコアで銘柄を可視化
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    CAN SLIM分析
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    オニール式成長株投資法に基づく5要素を自動スコア化し、有望銘柄を検出
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      C・A・S・L・M 5要素スコア
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      カップウィズハンドル等のパターン検出
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      複合スコアによるランキング
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-5/10">
                    <Shield className="h-6 w-6 text-chart-5" />
                  </div>
                  <CardTitle className="text-xl">AI定性分析</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    最新ニュース・業界動向・SNSの声をAIが総合的に分析し、投資判断を支援
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      ニュース・IR情報の自動収集
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      SNS注目度スコア
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      リスク要因の可視化
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:col-span-2 lg:col-span-1">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl">
                    売りシグナル通知
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    保有株を登録し、オニール式6つの売りルールに基づく売り時を自動判定
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      ポートフォリオ管理
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      損切り・利確シグナル
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-chart-3 shrink-0" />
                      緊急度レベル表示
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-t border-border/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                シンプルな料金プラン
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                まずは30日間無料でお試しください
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-md">
              <Card className="relative overflow-hidden border-primary/30 bg-card/50 backdrop-blur">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                <CardHeader className="text-center pb-2">
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
                  <p className="mt-2 text-sm text-primary font-medium">
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
                        <Check className="h-4 w-4 text-chart-3 shrink-0" />
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
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 px-8 py-16 text-center sm:px-16">
              <div className="pointer-events-none absolute -top-20 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[80px]" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  データに基づく投資判断を始めよう
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                  感覚ではなくデータで。30日間の無料トライアルで、
                  StockLensの分析力を体験してください。
                </p>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-8 px-8 text-base font-semibold"
                  )}
                >
                  無料で始める
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Disclaimer */}
          <div className="mb-8 rounded-lg border border-border/50 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground/70 mb-1">免責事項</p>
            <p>
              本サービスは投資助言業に該当しません。表示される分析スコアおよびデータは情報提供を目的としたものであり、
              特定の金融商品の売買を推奨するものではありません。投資の最終判断はご自身の責任で行ってください。
              金融商品取引法に基づく投資助言・代理業の登録は行っておりません。
            </p>
          </div>

          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold">StockLens</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/terms"
                className="transition-colors hover:text-foreground"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="transition-colors hover:text-foreground"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/tokushoho"
                className="transition-colors hover:text-foreground"
              >
                特定商取引法に基づく表記
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} StockLens. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
