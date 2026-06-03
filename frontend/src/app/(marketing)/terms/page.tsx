import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "利用規約",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">利用規約</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        最終更新日: 2026年5月13日
      </p>
      <Separator className="my-8" />

      <div className="max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第1条（サービスの概要）
          </h2>
          <p>
            StockLens（以下「本サービス」）は、株式市場に関するデータ分析結果を提供するWebサービスです。
            本サービスは投資助言業に該当せず、金融商品取引法に基づく投資助言・代理業の登録は行っておりません。
            提供する情報は、データの分析結果であり、特定の金融商品の売買を推奨するものではありません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第2条（利用登録）
          </h2>
          <p>
            本サービスの利用を希望する方は、所定の方法により利用登録を行うものとします。
            登録にあたっては正確な情報を提供してください。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第3条（無料トライアル・有料プラン）
          </h2>
          <p>
            新規登録のユーザーには30日間の無料トライアルを提供します。
            トライアル期間終了後は、有料プラン（月額1,980円・税込）への移行により継続利用が可能です。
            有料プランの解約はいつでも可能です。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第4条（免責事項）
          </h2>
          <p>
            本サービスで提供する分析スコア・データは情報提供を目的としたものです。
            投資の最終判断はお客様ご自身の責任において行ってください。
            本サービスの利用により生じた損害について、当社は一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第5条（禁止事項）
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>本サービスの不正利用</li>
            <li>データの無断転載・再配布</li>
            <li>サーバーに過度の負荷をかける行為</li>
            <li>他のユーザーへの迷惑行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第6条（サービスの変更・終了）
          </h2>
          <p>
            当社は、事前の通知なくサービス内容の変更または終了を行うことがあります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            第7条（準拠法・管轄）
          </h2>
          <p>
            本規約は日本法に準拠し、紛争が生じた場合は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </div>
    </div>
  );
}
