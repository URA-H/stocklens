"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash2, Loader2, X, BarChart3 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface WatchlistItem {
  id: string;
  ticker: string;
  companyName: string;
  memo: string | null;
  createdAt: string;
}

interface StockScore {
  ticker: string;
  score: number;
  signal: "buy" | "hold" | "sell";
  canslim: { C: number; A: number; S: number; L: number; M: number };
}

// ── Add Form ─────────────────────────────────────────────────────────

function AddWatchlistForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.get("ticker"),
          companyName: form.get("companyName") || undefined,
          memo: form.get("memo") || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登録に失敗しました");
        return;
      }

      setOpen(false);
      onAdded();
      (e.target as HTMLFormElement).reset();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2" size="sm">
        <Plus className="h-4 w-4" />
        銘柄を追加
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">銘柄を追加</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="wl-ticker" className="text-xs">
                ティッカー *
              </Label>
              <Input
                id="wl-ticker"
                name="ticker"
                placeholder="例: 8306.T"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-companyName" className="text-xs">
                企業名
              </Label>
              <Input
                id="wl-companyName"
                name="companyName"
                placeholder="例: 三菱UFJ FG"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-memo" className="text-xs">
                メモ
              </Label>
              <Input
                id="wl-memo"
                name="memo"
                placeholder="注目理由など"
                className="h-9"
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            追加
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Signal Badge ─────────────────────────────────────────────────────

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

// ── Watchlist Table ──────────────────────────────────────────────────

function WatchlistTable({
  items,
  scores,
  scoresLoading,
  onDelete,
}: {
  items: WatchlistItem[];
  scores: Map<string, StockScore>;
  scoresLoading: boolean;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium">
            ウォッチリストに銘柄がありません
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            「銘柄を追加」から気になる銘柄を登録して、CAN
            SLIMスコアの変動をまとめて確認しましょう。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  銘柄
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                  シグナル
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  スコア
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                  C
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                  A
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">
                  S
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">
                  L
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden lg:table-cell">
                  M
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const s = scores.get(item.ticker);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium">{item.companyName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {item.ticker}
                        </span>
                        {item.memo && (
                          <span className="text-xs text-muted-foreground/60">
                            - {item.memo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {s ? (
                        <SignalBadge signal={s.signal} />
                      ) : scoresLoading ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {s ? (
                        <span
                          className={`font-bold tabular-nums ${
                            s.score >= 70
                              ? "text-chart-3"
                              : s.score >= 40
                                ? "text-chart-4"
                                : "text-destructive"
                          }`}
                        >
                          {s.score}
                        </span>
                      ) : scoresLoading ? (
                        <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                      {s?.canslim.C ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                      {s?.canslim.A ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums text-muted-foreground hidden md:table-cell">
                      {s?.canslim.S ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums text-muted-foreground hidden md:table-cell">
                      {s?.canslim.L ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums text-muted-foreground hidden lg:table-cell">
                      {s?.canslim.M ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [scores, setScores] = useState<Map<string, StockScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScores = useCallback(async () => {
    setScoresLoading(true);
    try {
      const res = await fetch("/api/stocks/recommendations");
      if (res.ok) {
        const data: StockScore[] = await res.json();
        const map = new Map<string, StockScore>();
        for (const s of data) {
          map.set(s.ticker, s);
        }
        setScores(map);
      }
    } catch {
      // silently fail — scores are supplementary
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchScores();
  }, [fetchItems, fetchScores]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  const watchedWithScores = items.filter((i) => scores.has(i.ticker));
  const avgScore =
    watchedWithScores.length > 0
      ? Math.round(
          watchedWithScores.reduce(
            (sum, i) => sum + (scores.get(i.ticker)?.score ?? 0),
            0
          ) / watchedWithScores.length
        )
      : null;
  const buyCount = watchedWithScores.filter(
    (i) => scores.get(i.ticker)?.signal === "buy"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ウォッチリスト</h1>
          <p className="text-muted-foreground">
            気になる銘柄をまとめて管理
          </p>
        </div>
        <AddWatchlistForm onAdded={fetchItems} />
      </div>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>登録銘柄数</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{items.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ウォッチリスト
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>注目シグナル</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-chart-3">
                {buyCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                CAN SLIMスコア70+
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>平均スコア</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-primary">
                {avgScore ?? "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ウォッチリスト平均
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Watchlist Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">CAN SLIM スコア一覧</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WatchlistTable
            items={items}
            scores={scores}
            scoresLoading={scoresLoading}
            onDelete={handleDelete}
          />
        )}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground/70">
          ※ CAN
          SLIMスコアはオニール式成長株分析に基づく参考指標です。特定の金融商品の売買を推奨するものではありません。投資の最終判断はご自身の責任で行ってください。
        </p>
      )}
    </div>
  );
}
