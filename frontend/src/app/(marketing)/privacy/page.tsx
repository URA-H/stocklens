import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "プライバシーポリシー",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">
        プライバシーポリシー
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        最終更新日: 2026年5月13日
      </p>
      <Separator className="my-8" />

      <div className="max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. 収集する情報
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>メールアドレス、お名前（アカウント登録時）</li>
            <li>決済情報（Stripeを通じて安全に処理されます）</li>
            <li>サービス利用状況（アクセスログ、閲覧履歴）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. 情報の利用目的
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>サービスの提供・運営</li>
            <li>お客様サポート</li>
            <li>サービス改善のための統計分析</li>
            <li>重要なお知らせの通知</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. 第三者提供
          </h2>
          <p>
            法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。
            決済処理はStripe, Inc.を通じて行われます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. データの保護
          </h2>
          <p>
            個人情報の漏洩、紛失、改ざんを防止するため、適切な安全管理措置を講じています。
            パスワードは暗号化して保存されます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. お問い合わせ
          </h2>
          <p>
            プライバシーに関するお問い合わせは、サービス内のお問い合わせフォームよりご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
