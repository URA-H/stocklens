import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BarChart3 className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">StockLens</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
