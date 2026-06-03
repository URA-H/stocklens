"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface SignalSummary {
  has_urgent: boolean;
  has_warning: boolean;
  signal_count: number;
  ticker: string;
  company_name: string;
}

export function SellSignalBanner() {
  const [signals, setSignals] = useState<SignalSummary[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch("/api/holdings/signals");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setSignals(data.filter((s: SignalSummary) => s.signal_count > 0));
        }
      } catch {
        // Silent — banner is non-critical
      }
    }
    fetchSignals();
  }, []);

  if (signals.length === 0 || !visible) return null;

  const urgentCount = signals.filter((s) => s.has_urgent).length;
  const totalCount = signals.reduce((sum, s) => s.signal_count + sum, 0);

  return (
    <Link
      href="/portfolio"
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50 ${
        urgentCount > 0
          ? "border-destructive/30 bg-destructive/5"
          : "border-chart-4/30 bg-chart-4/5"
      }`}
    >
      <AlertTriangle
        className={`h-5 w-5 shrink-0 ${
          urgentCount > 0 ? "text-destructive" : "text-chart-4"
        }`}
      />
      <div className="flex-1 text-sm">
        <span className="font-medium">
          保有株に{totalCount}件のシグナルが出ています
        </span>
        {urgentCount > 0 && (
          <span className="ml-2 text-xs text-destructive">
            （{urgentCount}件 要注意）
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
