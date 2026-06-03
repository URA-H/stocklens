import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      subscriptionStatus: string;
      trialEndsAt: string; // ISO string
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionStatus: string;
    trialEndsAt: string; // ISO string
  }
}
