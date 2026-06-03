import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "StockLens <noreply@stocklens.jp>";

/** Send email, swallowing errors so callers don't break. */
async function send(to: string, subject: string, html: string) {
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error("[email] Failed to send:", e);
  }
}

// ── Templates ────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  await send(
    to,
    "StockLensへようこそ！30日間の無料トライアル開始",
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:24px;color:#0f172a">ようこそ、${name || ""}さん！</h1>
      <p style="color:#475569;line-height:1.7">
        StockLensへの登録ありがとうございます。<br>
        本日から<strong>30日間</strong>、すべての機能を無料でお試しいただけます。
      </p>
      <ul style="color:#475569;line-height:2">
        <li>CAN SLIM複合スコア分析</li>
        <li>AI定性分析レビュー</li>
        <li>売りシグナル通知</li>
        <li>ポートフォリオ管理</li>
      </ul>
      <a href="${process.env.NEXTAUTH_URL}/dashboard"
         style="display:inline-block;background:#38BDF8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
        ダッシュボードを開く
      </a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px">
        ※ このメールは${to}宛に送信されました。<br>
        心当たりがない場合はこのメールを無視してください。
      </p>
    </div>
    `
  );
}

export async function sendTrialReminderEmail(
  to: string,
  name: string,
  daysLeft: number
) {
  await send(
    to,
    `【StockLens】無料トライアル残り${daysLeft}日`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:24px;color:#0f172a">${name || ""}さん、トライアル残り${daysLeft}日です</h1>
      <p style="color:#475569;line-height:1.7">
        StockLensの無料トライアル期間が残り<strong>${daysLeft}日</strong>となりました。<br>
        トライアル終了後も引き続き分析機能をご利用いただくには、プランへのご登録が必要です。
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:24px 0;text-align:center">
        <p style="margin:0;font-size:14px;color:#64748b">スタンダードプラン</p>
        <p style="margin:8px 0 0;font-size:32px;font-weight:700;color:#0f172a">¥1,980<span style="font-size:14px;color:#64748b">/月</span></p>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/pricing"
         style="display:inline-block;background:#38BDF8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
        プランを確認する
      </a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px">
        StockLens — データに基づく投資判断を
      </p>
    </div>
    `
  );
}

export async function sendSubscriptionConfirmEmail(to: string, name: string) {
  await send(
    to,
    "【StockLens】サブスクリプション開始のお知らせ",
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:24px;color:#0f172a">ご登録ありがとうございます！</h1>
      <p style="color:#475569;line-height:1.7">
        ${name || ""}さん、スタンダードプラン（月額¥1,980）への登録が完了しました。<br>
        すべての分析機能を引き続きご利用いただけます。
      </p>
      <a href="${process.env.NEXTAUTH_URL}/dashboard"
         style="display:inline-block;background:#38BDF8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
        ダッシュボードを開く
      </a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px">
        サブスクリプションの管理は設定ページからいつでも行えます。
      </p>
    </div>
    `
  );
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  await send(
    to,
    "【StockLens】お支払いに問題があります",
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:24px;color:#dc2626">${name || ""}さん、お支払いに失敗しました</h1>
      <p style="color:#475569;line-height:1.7">
        直近のお支払いが正常に処理されませんでした。<br>
        お支払い方法を更新していただくか、カード会社にお問い合わせください。
      </p>
      <a href="${process.env.NEXTAUTH_URL}/settings"
         style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
        お支払い方法を更新する
      </a>
      <p style="color:#94a3b8;font-size:13px;margin-top:32px">
        ご不明な点がございましたらお気軽にお問い合わせください。
      </p>
    </div>
    `
  );
}

export async function sendCancellationEmail(to: string, name: string) {
  await send(
    to,
    "【StockLens】サブスクリプション解約のお知らせ",
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:24px;color:#0f172a">解約を承りました</h1>
      <p style="color:#475569;line-height:1.7">
        ${name || ""}さん、サブスクリプションの解約が完了しました。<br>
        現在の請求期間の終了まで引き続きサービスをご利用いただけます。
      </p>
      <p style="color:#475569;line-height:1.7">
        またいつでも再開いただけます。StockLensをご利用いただきありがとうございました。
      </p>
      <a href="${process.env.NEXTAUTH_URL}/pricing"
         style="display:inline-block;background:#38BDF8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
        プランを再開する
      </a>
    </div>
    `
  );
}
