import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Loader2 } from "lucide-react";
import { CanSlimRadar } from "@/components/charts/canslim-radar";
import { ScoreBar } from "@/components/charts/score-bar";
import { AIReviewSection } from "@/components/charts/ai-review-card";
import { SellSignalBanner } from "@/components/sell-signal-banner";

// ── Types ─────────────────────────────────────────────────────────────

interface CanSlimScores {
  C: number;
  A: number;
  S: number;
  L: number;
  M: number;
}

interface CanSlimDetails {
  C: string;
  A: string;
  S: string;
  L: string;
  M: string;
}

interface Stock {
  ticker: string;
  name: string;
  score: number;
  signal: "buy" | "hold" | "sell";
  canslim: CanSlimScores;
  canslimDetails: CanSlimDetails;
  patterns: string[];
}

interface AIReview {
  ticker: string;
  companyName: string;
  overallSentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  summary: string;
  keyPoints: string[];
  riskFactors: string[];
  snsBuzz: string;
  snsScore: number;
  industryOutlook: string;
  generatedAt: string;
  cached?: boolean;
}

// ── Data fetching ─────────────────────────────────────────────────────

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_KEY = process.env.BACKEND_API_KEY || "dev-api-key";

async function fetchAIReview(ticker: string, companyName: string): Promise<AIReview | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/stocks/${ticker}/ai-review`, {
      headers: { "X-Api-Key": API_KEY },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ticker,
      companyName,
      overallSentiment: data.overall_sentiment || "neutral",
      sentimentScore: data.sentiment_score ?? 50,
      summary: data.summary || "",
      keyPoints: data.key_points || [],
      riskFactors: data.risk_factors || [],
      snsBuzz: data.sns_buzz || "",
      snsScore: data.sns_score ?? 0,
      industryOutlook: data.industry_outlook || "",
      generatedAt: data.generated_at || new Date().toISOString(),
      cached: data.cached ?? false,
    };
  } catch {
    return null;
  }
}

async function fetchRecommendations(): Promise<Stock[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/recommendations/`, {
      headers: { "X-Api-Key": API_KEY },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();

    return data.map((item: Record<string, unknown>) => {
      // Extract CAN SLIM strategy from strategies array
      const strategies = (item.strategies as Record<string, unknown>[]) || [];
      const canslimStrategy = strategies.find(
        (s) => (s.metadata as Record<string, unknown>)?.canslim_scores
      );
      const canslimMeta = (canslimStrategy?.metadata || {}) as Record<string, unknown>;
      const scores = (canslimMeta.canslim_scores || {}) as Record<string, number>;
      const details = (canslimMeta.canslim_details || {}) as Record<string, string>;

      // Extract patterns from cup_with_handle strategy
      const cupStrategy = strategies.find(
        (s) => (s.metadata as Record<string, unknown>)?.cup_with_handle
      );
      const patterns: string[] = [];
      if (cupStrategy) {
        const cupMeta = (cupStrategy.metadata || {}) as Record<string, unknown>;
        if (cupMeta.cup_with_handle) patterns.push("カップウィズハンドル");
        if (cupMeta.flat_base) patterns.push("フラットベース");
        if (cupMeta.double_bottom) patterns.push("ダブルボトム");
      }

      return {
        ticker: item.ticker as string,
        name: (item.ticker as string).replace(".T", ""),
        score: Math.round(item.score as number),
        signal: item.signal as "buy" | "hold" | "sell",
        canslim: {
          C: Math.round(scores.C || 50),
          A: Math.round(scores.A || 50),
          S: Math.round(scores.S || 50),
          L: Math.round(scores.L || 50),
          M: Math.round(scores.M || 50),
        },
        canslimDetails: {
          C: details.C || "",
          A: details.A || "",
          S: details.S || "",
          L: details.L || "",
          M: details.M || "",
        },
        patterns,
      };
    });
  } catch {
    return [];
  }
}

// ── Components ────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: "buy" | "hold" | "sell" }) {
  const config = {
    buy: {
      label: "注目",
      className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    },
    hold: {
      label: "様子見",
      className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    },
    sell: {
      label: "警戒",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };
  const { label, className } = config[signal];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const stocks = await fetchRecommendations();

  const hasData = stocks.length > 0;
  const featured = stocks[0] ?? null;
  const buyCount = stocks.filter((s) => s.signal === "buy").length;
  const patternCount = stocks.filter((s) => s.patterns.length > 0).length;

  // Fetch AI reviews for top 2 stocks in parallel
  const aiReviews: AIReview[] = [];
  if (hasData) {
    const topStocks = stocks.slice(0, 2);
    const results = await Promise.all(
      topStocks.map((s) => fetchAIReview(s.ticker, s.name))
    );
    for (const r of results) {
      if (r) aiReviews.push(r);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">
          CAN SLIM分析に基づく本日の注目銘柄
        </p>
      </div>

      {/* Sell Signal Banner */}
      <SellSignalBanner />

      {/* No data fallback */}
      {!hasData && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              分析データを取得中...
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              バックエンドサーバーが起動していることを確認してください
            </p>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>分析銘柄数</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">
                  {stocks.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  分析完了銘柄
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>CAN SLIMスコア70+</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-chart-3">
                  {buyCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  注目シグナル銘柄
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>パターン検出</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-primary">
                  {patternCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  カップウィズハンドル等
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Featured Stock: CAN SLIM Radar */}
          {featured && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {featured.name}
                      </CardTitle>
                      <CardDescription>
                        {featured.ticker} ・ CAN SLIMスコア{" "}
                        <span className="font-bold text-primary">
                          {featured.score}
                        </span>
                      </CardDescription>
                    </div>
                    <SignalBadge signal={featured.signal} />
                  </div>
                </CardHeader>
                <CardContent>
                  <CanSlimRadar scores={featured.canslim} />
                  {featured.patterns.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {featured.patterns.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className="border-primary/30 text-primary"
                        >
                          <Activity className="mr-1 h-3 w-3" />
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">
                    CAN SLIM 要素分析
                  </CardTitle>
                  <CardDescription>
                    {featured.name}（{featured.ticker}）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBar
                    label="C - 四半期EPS成長"
                    score={featured.canslim.C}
                    detail={featured.canslimDetails.C}
                  />
                  <ScoreBar
                    label="A - 年間利益成長"
                    score={featured.canslim.A}
                    detail={featured.canslimDetails.A}
                  />
                  <ScoreBar
                    label="S - 需給（出来高・浮動株）"
                    score={featured.canslim.S}
                    detail={featured.canslimDetails.S}
                  />
                  <ScoreBar
                    label="L - 相対力（RS）"
                    score={featured.canslim.L}
                    detail={featured.canslimDetails.L}
                  />
                  <ScoreBar
                    label="M - 市場方向"
                    score={featured.canslim.M}
                    detail={featured.canslimDetails.M}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Rankings Table */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>CAN SLIM ランキング</CardTitle>
              </div>
              <CardDescription>
                オニール式複合スコアの高い銘柄
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-3 text-left font-medium text-muted-foreground">
                        銘柄
                      </th>
                      <th className="pb-3 text-left font-medium text-muted-foreground">
                        シグナル
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">
                        スコア
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                        C
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                        A
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground hidden md:table-cell">
                        S
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground hidden md:table-cell">
                        L
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground hidden lg:table-cell">
                        M
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((stock) => (
                      <tr
                        key={stock.ticker}
                        className="border-b border-border/30 transition-colors hover:bg-muted/30"
                      >
                        <td className="py-4">
                          <p className="font-medium">{stock.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {stock.ticker}
                            </span>
                            {stock.patterns.length > 0 && (
                              <Badge
                                variant="outline"
                                className="h-4 border-primary/20 px-1 text-[10px] text-primary"
                              >
                                {stock.patterns[0]}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <SignalBadge signal={stock.signal} />
                        </td>
                        <td className="py-4 text-center">
                          <span
                            className={`font-bold tabular-nums ${
                              stock.score >= 70
                                ? "text-chart-3"
                                : stock.score >= 40
                                  ? "text-chart-4"
                                  : "text-destructive"
                            }`}
                          >
                            {stock.score}
                          </span>
                        </td>
                        <td className="py-4 text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                          {stock.canslim.C}
                        </td>
                        <td className="py-4 text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                          {stock.canslim.A}
                        </td>
                        <td className="py-4 text-center tabular-nums text-muted-foreground hidden md:table-cell">
                          {stock.canslim.S}
                        </td>
                        <td className="py-4 text-center tabular-nums text-muted-foreground hidden md:table-cell">
                          {stock.canslim.L}
                        </td>
                        <td className="py-4 text-center tabular-nums text-muted-foreground hidden lg:table-cell">
                          {stock.canslim.M}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-6 text-xs text-muted-foreground/70">
                ※ CAN
                SLIMスコアはオニール式成長株分析に基づく参考指標です。
                特定の金融商品の売買を推奨するものではありません。
                投資の最終判断はご自身の責任で行ってください。
              </p>
            </CardContent>
          </Card>

          {/* AI Review Section */}
          <AIReviewSection reviews={aiReviews} />
        </>
      )}
    </div>
  );
}
