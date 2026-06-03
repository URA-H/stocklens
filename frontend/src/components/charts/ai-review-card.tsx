"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Globe,
} from "lucide-react";

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

interface AIReviewCardProps {
  review: AIReview;
}

function SentimentBadge({
  sentiment,
  score,
}: {
  sentiment: string;
  score: number;
}) {
  const config = {
    positive: {
      label: "ポジティブ",
      icon: TrendingUp,
      className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    },
    neutral: {
      label: "中立",
      icon: Minus,
      className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    },
    negative: {
      label: "ネガティブ",
      icon: TrendingDown,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };
  const { label, icon: Icon, className } =
    config[sentiment as keyof typeof config] || config.neutral;

  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label} {score}
    </Badge>
  );
}

function SnsScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 70) return "bg-chart-5";
    if (s >= 40) return "bg-chart-4";
    return "bg-muted-foreground";
  };

  return (
    <div className="flex items-center gap-3">
      <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">SNS注目度</span>
          <span className="tabular-nums font-semibold">{score}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${getColor(score)} transition-all duration-700 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function AIReviewCard({ review }: AIReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-border/50 bg-card/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10">
              <Brain className="h-4 w-4 text-chart-5" />
            </div>
            <div>
              <CardTitle className="text-base">AI分析レビュー</CardTitle>
              <CardDescription className="text-xs">
                {review.companyName}（{review.ticker}）
              </CardDescription>
            </div>
          </div>
          <SentimentBadge
            sentiment={review.overallSentiment}
            score={review.sentimentScore}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {review.summary}
        </p>

        {/* Key Points */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-chart-4" />
            注目ポイント
          </div>
          <ul className="space-y-1.5">
            {review.keyPoints.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-1" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* SNS Score */}
        <SnsScoreBar score={review.snsScore} />

        {/* Expandable section */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          {expanded ? (
            <>
              閉じる <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              詳細を表示 <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-border/30 pt-4">
            {/* Risk Factors */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                リスク要因
              </div>
              <ul className="space-y-1.5">
                {review.riskFactors.map((risk, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/60" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            {/* SNS Buzz */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <MessageCircle className="h-3.5 w-3.5 text-chart-5" />
                SNS・投資家の声
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {review.snsBuzz}
              </p>
            </div>

            {/* Industry Outlook */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Globe className="h-3.5 w-3.5 text-chart-2" />
                業界見通し
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {review.industryOutlook}
              </p>
            </div>

            {/* Metadata */}
            <p className="text-[10px] text-muted-foreground/50">
              生成日時: {new Date(review.generatedAt).toLocaleString("ja-JP")}
              {review.cached && " (キャッシュ)"}
              {" "}・ AI分析は参考情報です
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Full section for the dashboard with multiple reviews
interface AIReviewSectionProps {
  reviews: AIReview[];
}

export function AIReviewSection({ reviews }: AIReviewSectionProps) {
  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-chart-5" />
        <h2 className="text-lg font-bold">AI定性分析</h2>
        <Badge variant="outline" className="border-chart-5/30 text-chart-5">
          Powered by Claude
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <AIReviewCard key={review.ticker} review={review} />
        ))}
      </div>
    </div>
  );
}
