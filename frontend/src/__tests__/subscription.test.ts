import { describe, it, expect } from "vitest";
import { isSubscriptionActive } from "../lib/subscription";

describe("isSubscriptionActive", () => {
  it("returns true for active subscription", () => {
    expect(isSubscriptionActive("active", "2020-01-01T00:00:00Z")).toBe(true);
  });

  it("returns true for trialing within period", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionActive("trialing", future)).toBe(true);
  });

  it("returns false for trialing past expiry", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionActive("trialing", past)).toBe(false);
  });

  it("returns false for expired status", () => {
    expect(isSubscriptionActive("expired", "2099-01-01T00:00:00Z")).toBe(false);
  });

  it("returns false for canceled status", () => {
    expect(isSubscriptionActive("canceled", "2099-01-01T00:00:00Z")).toBe(false);
  });

  it("returns false for past_due status", () => {
    expect(isSubscriptionActive("past_due", "2099-01-01T00:00:00Z")).toBe(false);
  });

  it("returns false for empty status", () => {
    expect(isSubscriptionActive("", "2099-01-01T00:00:00Z")).toBe(false);
  });

  it("active status ignores trialEndsAt", () => {
    const past = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionActive("active", past)).toBe(true);
  });
});
