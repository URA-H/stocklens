# StockLens デプロイガイド

## 前提条件

- [Vercel](https://vercel.com) アカウント
- [Railway](https://railway.app) アカウント
- [Stripe](https://stripe.com) アカウント（テストモード）
- [Resend](https://resend.com) アカウント
- ドメイン: `stocklens.jp`（任意）

---

## 1. Railway（バックエンド + DB）

### 1-1. Railway CLI インストール

```bash
brew install railway
railway login
```

### 1-2. プロジェクト作成 + PostgreSQL追加

```bash
cd backend
railway init          # プロジェクト名: stocklens-backend
railway add --plugin postgresql
```

### 1-3. DB接続URLを取得

```bash
railway variables    # DATABASE_URL が自動設定されている
```

この `DATABASE_URL` をメモ（Vercel側でも使う）。

### 1-4. 環境変数を設定

```bash
railway variables set API_KEY="$(openssl rand -base64 32)"
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set CORS_ORIGINS='["https://stocklens.jp","https://stocklens.vercel.app"]'
railway variables set DEBUG=false
```

### 1-5. デプロイ

```bash
railway up
```

デプロイ完了後、URLをメモ（例: `https://stocklens-backend-production.up.railway.app`）。

ヘルスチェック確認:
```bash
curl https://YOUR_RAILWAY_URL/health
```

---

## 2. データベースマイグレーション

Railway のDB URLを使って、フロントエンド側からマイグレーションを実行。

```bash
cd frontend
DATABASE_URL="postgresql://..." npx prisma db push
```

または、マイグレーションファイルを使う場合:
```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## 3. Vercel（フロントエンド）

### 3-1. デプロイ

```bash
cd frontend
vercel
```

初回は対話で設定:
- Framework: Next.js（自動検出）
- Root Directory: `.`（デフォルト）

### 3-2. 環境変数を設定

```bash
# Database（RailwayのPostgreSQL URL）
vercel env add DATABASE_URL               # Railway の DATABASE_URL

# NextAuth
vercel env add NEXTAUTH_URL               # https://stocklens.jp or https://your-app.vercel.app
vercel env add AUTH_SECRET                 # openssl rand -base64 32

# Stripe
vercel env add STRIPE_SECRET_KEY          # sk_live_... or sk_test_...
vercel env add STRIPE_PUBLISHABLE_KEY     # pk_live_... or pk_test_...
vercel env add STRIPE_WEBHOOK_SECRET      # whsec_...（Stripe Dashboard で作成）
vercel env add STRIPE_PRICE_ID            # price_...（Stripe Dashboard で作成）

# Backend
vercel env add BACKEND_URL                # Railway の URL
vercel env add BACKEND_API_KEY            # Railway の API_KEY と同じ値

# Email
vercel env add RESEND_API_KEY             # Resend Dashboard から取得

# Cron
vercel env add CRON_SECRET                # openssl rand -base64 32
```

### 3-3. 本番デプロイ

```bash
vercel --prod
```

---

## 4. Stripe 設定

### 4-1. 商品・価格の作成

Stripe Dashboard > Products で作成:
- 商品名: `StockLens スタンダードプラン`
- 価格: ¥1,980/月（recurring）
- 作成された `price_...` を `STRIPE_PRICE_ID` に設定

### 4-2. Webhook エンドポイント

Stripe Dashboard > Developers > Webhooks で追加:
- URL: `https://stocklens.jp/api/stripe/webhook`
- イベント:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- 作成された Signing Secret を `STRIPE_WEBHOOK_SECRET` に設定

---

## 5. Resend 設定

### 5-1. ドメイン認証

Resend Dashboard > Domains で `stocklens.jp` を追加し、DNS レコードを設定。

### 5-2. APIキー

Resend Dashboard > API Keys で作成 → `RESEND_API_KEY` に設定。

---

## 6. カスタムドメイン（任意）

### Vercel

```bash
vercel domains add stocklens.jp
```

DNS で CNAME を Vercel に向ける。

### NEXTAUTH_URL の更新

```bash
vercel env rm NEXTAUTH_URL
vercel env add NEXTAUTH_URL    # https://stocklens.jp
vercel --prod
```

---

## 動作確認チェックリスト

- [ ] LP (/) が表示される
- [ ] サインアップ → トライアル開始 → ウェルカムメール受信
- [ ] ログイン → ダッシュボード表示
- [ ] CAN SLIM ランキングが表示される（バックエンド接続）
- [ ] ポートフォリオ: 保有株登録 → 売りシグナル表示
- [ ] ウォッチリスト: 銘柄追加/削除
- [ ] 設定ページ: Stripe ポータルへ遷移
- [ ] OGP画像: SNS共有時にプレビュー表示
- [ ] robots.txt / sitemap.xml がアクセス可能
- [ ] Stripe テスト決済（カード: 4242 4242 4242 4242）
- [ ] トライアル期限切れ → /expired リダイレクト

---

## コスト見積もり（月額）

| サービス | プラン | 費用 |
|---------|--------|------|
| Vercel | Hobby (無料) → Pro ($20) | $0〜$20 |
| Railway | Starter ($5 credit) → Pro | $5〜$15 |
| Resend | Free (3,000通/月) | $0 |
| Stripe | 3.6% + ¥40/決済 | 従量 |
| **合計** | | **$5〜$35/月** |
