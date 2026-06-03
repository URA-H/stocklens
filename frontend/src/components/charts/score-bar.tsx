"use client";

interface ScoreBarProps {
  label: string;
  score: number;
  detail?: string;
}

const SCORE_COLORS = {
  high: "bg-chart-3",    // green
  medium: "bg-chart-4",  // amber
  low: "bg-destructive", // red
};

function getColor(score: number) {
  if (score >= 70) return SCORE_COLORS.high;
  if (score >= 40) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
}

export function ScoreBar({ label, score, detail }: ScoreBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums font-semibold">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getColor(score)} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      {detail && (
        <p className="text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
