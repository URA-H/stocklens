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
import {
  Briefcase,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Loader2,
  Bell,
  ShieldAlert,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface Holding {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  memo: string | null;
}

interface SellSignal {
  signal_type: string;
  severity: "urgent" | "warning" | "info";
  title: string;
  description: string;
  current_price: number;
  purchase_price: number;
  change_pct: number;
}

interface HoldingSignalResult {
  ticker: string;
  company_name: string;
  current_price: number;
  purchase_price: number;
  change_pct: number;
  signals: SellSignal[];
  has_urgent: boolean;
  has_warning: boolean;
  signal_count: number;
}

// ── Sell Signal Card ──────────────────────────────────────────────────

function SignalCard({ result }: { result: HoldingSignalResult }) {
  const [expanded, setExpanded] = useState(result.has_urgent);

  const severityIcon = {
    urgent: <AlertTriangle className="h-4 w-4 text-destructive" />,
    warning: <AlertCircle className="h-4 w-4 text-chart-4" />,
    info: <Info className="h-4 w-4 text-chart-1" />,
  };

  const severityBorder = {
    urgent: "border-destructive/30",
    warning: "border-chart-4/30",
    info: "border-border/50",
  };

  const topSeverity = result.has_urgent
    ? "urgent"
    : result.has_warning
      ? "warning"
      : "info";

  return (
    <Card
      className={`${severityBorder[topSeverity]} bg-card/50 cursor-pointer transition-colors hover:bg-card/80`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {severityIcon[topSeverity]}
            <div>
              <CardTitle className="text-sm">{result.company_name}</CardTitle>
              <CardDescription className="text-xs">
                {result.ticker}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">
              ¥{result.current_price.toLocaleString()}
            </p>
            <p
              className={`text-xs tabular-nums ${
                result.change_pct >= 0 ? "text-chart-3" : "text-destructive"
              }`}
            >
              {result.change_pct >= 0 ? "+" : ""}
              {result.change_pct}%
            </p>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {result.signals.map((signal, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/30 bg-background/50 p-3"
            >
              <div className="mb-1 flex items-center gap-2">
                {severityIcon[signal.severity]}
                <span className="text-xs font-semibold">{signal.title}</span>
                <Badge
                  variant="outline"
                  className={`ml-auto text-[10px] ${
                    signal.severity === "urgent"
                      ? "border-destructive/30 text-destructive"
                      : signal.severity === "warning"
                        ? "border-chart-4/30 text-chart-4"
                        : "border-chart-1/30 text-chart-1"
                  }`}
                >
                  {signal.severity === "urgent"
                    ? "要注意"
                    : signal.severity === "warning"
                      ? "注意"
                      : "参考"}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {signal.description}
              </p>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ── Add Holding Form ──────────────────────────────────────────────────

function AddHoldingForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.get("ticker"),
          companyName: form.get("companyName"),
          shares: Number(form.get("shares")),
          purchasePrice: Number(form.get("purchasePrice")),
          purchaseDate: form.get("purchaseDate"),
          memo: form.get("memo") || null,
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
      <Button
        onClick={() => setOpen(true)}
        className="gap-2"
        size="sm"
      >
        <Plus className="h-4 w-4" />
        保有株を登録
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">保有株を登録</CardTitle>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticker" className="text-xs">
                ティッカー *
              </Label>
              <Input
                id="ticker"
                name="ticker"
                placeholder="例: 8306.T"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs">
                企業名
              </Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="例: 三菱UFJ FG"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shares" className="text-xs">
                株数 *
              </Label>
              <Input
                id="shares"
                name="shares"
                type="number"
                min="1"
                step="1"
                placeholder="100"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice" className="text-xs">
                購入価格（円） *
              </Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                min="1"
                step="0.01"
                placeholder="2800"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchaseDate" className="text-xs">
                購入日 *
              </Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memo" className="text-xs">
                メモ
              </Label>
              <Input
                id="memo"
                name="memo"
                placeholder="購入理由など"
                className="h-9"
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            登録
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Holdings Table ────────────────────────────────────────────────────

function HoldingsTable({
  holdings,
  onDelete,
}: {
  holdings: Holding[];
  onDelete: (id: string) => void;
}) {
  if (holdings.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            保有株が登録されていません
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            「保有株を登録」ボタンから追加してください
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
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  株数
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  購入価格
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">
                  購入日
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border/30 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{h.companyName}</p>
                    <p className="text-xs text-muted-foreground">{h.ticker}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {h.shares.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ¥{h.purchasePrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    {new Date(h.purchaseDate).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(h.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [signals, setSignals] = useState<HoldingSignalResult[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [signalError, setSignalError] = useState("");

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/holdings");
      if (res.ok) {
        setHoldings(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHoldings(false);
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    setLoadingSignals(true);
    setSignalError("");
    try {
      const res = await fetch("/api/holdings/signals");
      if (res.ok) {
        setSignals(await res.json());
      } else {
        setSignalError("シグナルの取得に失敗しました");
      }
    } catch {
      setSignalError("バックエンドに接続できません");
    } finally {
      setLoadingSignals(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  useEffect(() => {
    if (holdings.length > 0) {
      fetchSignals();
    }
  }, [holdings.length, fetchSignals]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    }
  }

  const urgentCount = signals.filter((s) => s.has_urgent).length;
  const warningCount = signals.filter((s) => s.has_warning).length;
  const totalSignals = signals.reduce((sum, s) => sum + s.signal_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ポートフォリオ</h1>
          <p className="text-muted-foreground">
            保有株の管理と売りシグナルの確認
          </p>
        </div>
        <AddHoldingForm onAdded={fetchHoldings} />
      </div>

      {/* Signal Summary */}
      {totalSignals > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold tabular-nums text-destructive">
                  {urgentCount}
                </p>
                <p className="text-xs text-muted-foreground">要注意シグナル</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-chart-4/20 bg-chart-4/5">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-8 w-8 text-chart-4" />
              <div>
                <p className="text-2xl font-bold tabular-nums text-chart-4">
                  {warningCount}
                </p>
                <p className="text-xs text-muted-foreground">注意シグナル</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-chart-1/20 bg-chart-1/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Bell className="h-8 w-8 text-chart-1" />
              <div>
                <p className="text-2xl font-bold tabular-nums text-chart-1">
                  {totalSignals}
                </p>
                <p className="text-xs text-muted-foreground">
                  合計シグナル数
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sell Signals */}
      {signals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-chart-4" />
            <h2 className="text-lg font-bold">売りシグナル</h2>
            <Badge variant="outline" className="border-chart-4/30 text-chart-4">
              オニール式
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {signals.map((result) => (
              <SignalCard key={result.ticker} result={result} />
            ))}
          </div>
        </div>
      )}

      {loadingSignals && holdings.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">売りシグナルを分析中...</span>
        </div>
      )}

      {signalError && (
        <Card className="border-chart-4/20">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-chart-4" />
            <p className="text-sm text-muted-foreground">{signalError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSignals}
              className="ml-auto"
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Holdings Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">保有株一覧</h2>
        {loadingHoldings ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <HoldingsTable holdings={holdings} onDelete={handleDelete} />
        )}
      </div>

      <p className="text-xs text-muted-foreground/70">
        ※
        売りシグナルはオニール式成長株分析に基づく参考情報です。特定の金融商品の売買を推奨するものではありません。投資の最終判断はご自身の責任で行ってください。
      </p>
    </div>
  );
}
