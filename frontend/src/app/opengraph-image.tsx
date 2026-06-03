import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StockLens — データ分析で注目銘柄を発見";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative gradient orb */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo + Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          <span style={{ fontSize: "56px", fontWeight: 700, letterSpacing: "-1px" }}>
            StockLens
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            marginTop: "0",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
          }}
        >
          CAN SLIM分析 / AI定性レビュー / 売りシグナル通知
        </p>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            marginTop: "32px",
            background: "#38BDF8",
            color: "#0f172a",
            padding: "14px 40px",
            borderRadius: "12px",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          30日間無料トライアル
        </div>

        {/* Footer */}
        <p
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "#64748b",
          }}
        >
          stocklens.jp
        </p>
      </div>
    ),
    { ...size }
  );
}
