import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    );
  }

  try {
    const { email, password, name } = body;

    if (!email || !password) {
      return Response.json(
        { error: "メールアドレスとパスワードは必須です" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        trialEndsAt,
        subscriptionStatus: "trialing",
      },
    });

    // Send welcome email (don't await — non-blocking)
    sendWelcomeEmail(email, name || "");

    return Response.json(
      { message: "アカウントが作成されました", userId: user.id },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
