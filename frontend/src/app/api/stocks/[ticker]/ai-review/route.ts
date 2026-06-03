import { requireActiveSubscription } from "@/lib/api-auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_KEY = process.env.BACKEND_API_KEY || "dev-api-key";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  const { ticker } = await params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/stocks/${ticker}/ai-review`,
      {
        headers: { "X-Api-Key": API_KEY },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!res.ok) {
      return Response.json(
        { error: "AIレビューの取得に失敗しました" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "バックエンドに接続できません" },
      { status: 502 }
    );
  }
}
