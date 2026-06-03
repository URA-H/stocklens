import { requireActiveSubscription } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireActiveSubscription();
  if (result instanceof Response) return result;

  const { id } = await params;

  // Verify ownership
  const holding = await prisma.holding.findUnique({ where: { id } });
  if (!holding || holding.userId !== result.userId) {
    return Response.json({ error: "保有株が見つかりません" }, { status: 404 });
  }

  await prisma.holding.delete({ where: { id } });

  return Response.json({ message: "削除しました" });
}
