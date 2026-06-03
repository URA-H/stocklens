import { requireActiveSubscription } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  const holdings = await prisma.holding.findMany({
    where: { userId: result.userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(holdings);
}

export async function POST(request: Request) {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }

  const { ticker, companyName, shares, purchasePrice, purchaseDate, memo } =
    body;

  if (!ticker || !shares || !purchasePrice || !purchaseDate) {
    return Response.json(
      { error: "ティッカー、株数、購入価格、購入日は必須です" },
      { status: 400 }
    );
  }

  if (shares <= 0 || purchasePrice <= 0) {
    return Response.json(
      { error: "株数と購入価格は0より大きい値を入力してください" },
      { status: 400 }
    );
  }

  const holding = await prisma.holding.create({
    data: {
      userId: result.userId,
      ticker: ticker.toUpperCase(),
      companyName: companyName || ticker,
      shares: Number(shares),
      purchasePrice: Number(purchasePrice),
      purchaseDate: new Date(purchaseDate),
      memo: memo || null,
    },
  });

  return Response.json(holding, { status: 201 });
}
