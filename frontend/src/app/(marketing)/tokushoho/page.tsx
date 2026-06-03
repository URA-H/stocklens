import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "特定商取引法に基づく表記",
  robots: { index: true, follow: true },
};

export default function TokushohoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">
        特定商取引法に基づく表記
      </h1>
      <Separator className="my-8" />

      <div className="space-y-6 text-sm">
        <table className="w-full">
          <tbody className="divide-y divide-border/50">
            {[
              ["販売事業者", "【事業者名を記入してください】"],
              ["運営責任者", "【責任者名を記入してください】"],
              ["所在地", "【住所を記入してください】"],
              [
                "連絡先",
                "【メールアドレスを記入してください】\n※お問い合わせはメールにて承ります",
              ],
              ["販売価格", "月額1,980円（税込）"],
              [
                "支払方法",
                "クレジットカード（VISA、Mastercard、JCB、American Express）",
              ],
              ["支払時期", "月額課金（毎月自動引き落とし）"],
              [
                "サービス提供時期",
                "お支払い確認後、即時ご利用いただけます",
              ],
              [
                "返品・キャンセル",
                "サブスクリプションはいつでもキャンセル可能です。\n日割り返金はございません。キャンセル後も期間終了までご利用いただけます。",
              ],
              [
                "無料トライアル",
                "新規登録から30日間は無料でご利用いただけます。\nトライアル期間中にキャンセルした場合、料金は発生しません。",
              ],
              [
                "動作環境",
                "最新版のChrome、Safari、Firefox、Edgeを推奨",
              ],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="w-1/3 py-4 pr-4 align-top font-medium text-foreground">
                  {label}
                </td>
                <td className="py-4 text-muted-foreground whitespace-pre-line">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
