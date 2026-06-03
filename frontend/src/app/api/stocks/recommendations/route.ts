import { requireActiveSubscription } from "@/lib/api-auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_KEY = process.env.BACKEND_API_KEY || "dev-api-key";

export async function GET() {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/recommendations/`, {
      headers: { "X-Api-Key": API_KEY },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      return Response.json(
        { error: "レコメンドの取得に失敗しました" },
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
