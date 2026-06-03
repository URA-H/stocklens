import { requireActiveSubscription } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  const holdings = await prisma.holding.findMany({
    where: { userId: result.userId },
  });

  if (holdings.length === 0) {
    return Response.json([]);
  }

  // Call Python backend to check sell signals
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const apiKey = process.env.BACKEND_API_KEY || "dev-api-key";

  try {
    const response = await fetch(
      `${backendUrl}/api/v1/portfolio/check-sell-signals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          holdings: holdings.map((h) => ({
            ticker: h.ticker,
            purchase_price: h.purchasePrice,
            purchase_date: h.purchaseDate.toISOString().split("T")[0],
            company_name: h.companyName,
          })),
        }),
      }
    );

    if (!response.ok) {
      return Response.json(
        { error: "売りシグナルの取得に失敗しました" },
        { status: 502 }
      );
    }

    const signals = await response.json();
    return Response.json(signals);
  } catch {
    return Response.json(
      { error: "バックエンドに接続できません" },
      { status: 502 }
    );
  }
}
