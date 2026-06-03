import { auth } from "@/lib/auth";
import { isSubscriptionActive } from "@/lib/subscription";

/**
 * Verify the request is from an authenticated user with an active subscription.
 * Returns the user id on success, or a Response on failure.
 */
export async function requireActiveSubscription(): Promise<
  { userId: string } | Response
> {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { subscriptionStatus, trialEndsAt } = session.user;

  if (
    !subscriptionStatus ||
    !trialEndsAt ||
    !isSubscriptionActive(subscriptionStatus, trialEndsAt)
  ) {
    return Response.json(
      { error: "有効なサブスクリプションが必要です" },
      { status: 403 }
    );
  }

  return { userId: session.user.id };
}
