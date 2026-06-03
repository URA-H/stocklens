"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CanSlimScores {
  C: number;
  A: number;
  S: number;
  L: number;
  M: number;
}

interface CanSlimRadarProps {
  scores: CanSlimScores;
}

const LABELS: Record<string, string> = {
  C: "四半期EPS",
  A: "年間成長",
  S: "需給",
  L: "相対力",
  M: "市場方向",
};

export function CanSlimRadar({ scores }: CanSlimRadarProps) {
  const data = Object.entries(scores).map(([key, value]) => ({
    subject: LABELS[key] || key,
    score: value,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="hsl(215 20% 25%)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "hsl(215 16% 60%)", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "hsl(215 16% 40%)", fontSize: 10 }}
          tickCount={5}
        />
        <Radar
          name="CAN SLIM"
          dataKey="score"
          stroke="hsl(199 89% 60%)"
          fill="hsl(199 89% 60%)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(222 47% 9%)",
            border: "1px solid hsl(215 20% 20%)",
            borderRadius: "8px",
            color: "hsl(210 40% 96%)",
            fontSize: "13px",
          }}
          formatter={(value) => [`${value}点`, "スコア"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
