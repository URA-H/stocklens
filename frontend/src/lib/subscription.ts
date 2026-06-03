/**
 * Check if a user's subscription is active (trialing within period, or active).
 */
export function isSubscriptionActive(
  subscriptionStatus: string,
  trialEndsAt: string
): boolean {
  if (subscriptionStatus === "active") return true;
  if (subscriptionStatus === "trialing") {
    return new Date(trialEndsAt) > new Date();
  }
  return false;
}
