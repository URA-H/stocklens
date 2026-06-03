import { prisma } from "@/lib/db";
import { sendTrialReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find users whose trial ends in 3 days or 1 day
  const reminders = [3, 1] as const;
  let totalSent = 0;

  for (const daysLeft of reminders) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysLeft);

    // Match users whose trialEndsAt falls on the target day
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const users = await prisma.user.findMany({
      where: {
        subscriptionStatus: "trialing",
        trialEndsAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { email: true, name: true },
    });

    for (const user of users) {
      sendTrialReminderEmail(user.email, user.name || "", daysLeft);
      totalSent++;
    }
  }

  return Response.json({ sent: totalSent });
}
