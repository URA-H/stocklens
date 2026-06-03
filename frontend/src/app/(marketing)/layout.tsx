import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">StockLens</span>
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
            無料で始める
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6 px-4 text-sm text-muted-foreground sm:px-6">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            利用規約
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            プライバシーポリシー
          </Link>
          <Link href="/tokushoho" className="transition-colors hover:text-foreground">
            特定商取引法に基づく表記
          </Link>
        </div>
      </footer>
    </div>
  );
}
