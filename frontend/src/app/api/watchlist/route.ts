import { requireActiveSubscription } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  const items = await prisma.watchlist.findMany({
    where: { userId: result.userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(items);
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

  const { ticker, companyName, memo } = body;

  if (!ticker) {
    return Response.json(
      { error: "ティッカーは必須です" },
      { status: 400 }
    );
  }

  const normalizedTicker = ticker.toUpperCase();

  // Check duplicate
  const existing = await prisma.watchlist.findUnique({
    where: {
      userId_ticker: { userId: result.userId, ticker: normalizedTicker },
    },
  });

  if (existing) {
    return Response.json(
      { error: "この銘柄は既にウォッチリストに登録されています" },
      { status: 409 }
    );
  }

  const item = await prisma.watchlist.create({
    data: {
      userId: result.userId,
      ticker: normalizedTicker,
      companyName: companyName || normalizedTicker,
      memo: memo || null,
    },
  });

  return Response.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "IDは必須です" }, { status: 400 });
  }

  // Verify ownership
  const item = await prisma.watchlist.findUnique({ where: { id } });
  if (!item || item.userId !== result.userId) {
    return Response.json({ error: "見つかりません" }, { status: 404 });
  }

  await prisma.watchlist.delete({ where: { id } });

  return Response.json({ deleted: true });
}
