# StockLens

> 日本株を「数字」と「文脈」の両面から眺められる Web アプリ。チャートや決算指標だけでなく、ニュースや業界動向まで AI がまとめて読ませてくれます。

[![Tech: Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Tech: React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tech: FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![Tech: Claude API](https://img.shields.io/badge/Anthropic-Claude-cc785c)](https://www.anthropic.com/)
[![Tech: Prisma 7](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io/)

---

## 目次

- [どんなアプリか](#どんなアプリか)
- [スクリーンショット / デモ動画](#スクリーンショット--デモ動画)
- [使っている技術](#使っている技術)
- [アーキテクチャ](#アーキテクチャ)
- [仕組みの中身](#仕組みの中身)
  - [1. Claude API での定性分析パイプライン](#1-claude-api-での定性分析パイプライン)
  - [2. O'Neil 投資理論のコード実装](#2-oneil-投資理論のコード実装)
  - [3. その他の設計上の工夫](#3-その他の設計上の工夫)
- [主な機能](#主な機能)
- [ディレクトリ構成](#ディレクトリ構成)
- [ローカルで動かす](#ローカルで動かす)
- [開発で詰まったところ](#開発で詰まったところ)
- [今後やりたいこと](#今後やりたいこと)
- [このリポジトリについて](#このリポジトリについて)

---

## どんなアプリか

**StockLens** は、日本株の個別銘柄を分析するためのダッシュボードです。

- **数字の側面**: William O'Neil の名著 *How to Make Money in Stocks* に出てくる **CAN SLIM** や **カップウィズハンドル** のロジックを Python で実装し、銘柄を機械的にスコアリング・ランキングします
- **文脈の側面**: Claude API と Web 検索を組み合わせて、ニュース・業界動向・SNS の話題・IR 情報を集めてきて要約します
- **継続して使える形**: ログイン (NextAuth)、Stripe のサブスク (7日トライアル付き)、特商法表示まで含めた SaaS としての一通りの構成になっています

ただ株価を眺めるだけのツールではなく、「**なぜこの銘柄なのか**」までセットで見られるようにすることを目指しました。

---

## スクリーンショット / デモ動画

| 画面 | 説明 |
|------|------|
| ![Dashboard](./docs/screenshots/dashboard.png) | ダッシュボード（推奨銘柄ランキング） |
| ![AI Review](./docs/screenshots/ai-review.png) | AI レビュー（Claude による定性分析） |
| ![Portfolio](./docs/screenshots/portfolio.png) | ポートフォリオ（保有銘柄管理 + 売却シグナル） |
| ![Watchlist](./docs/screenshots/watchlist.png) | ウォッチリスト |
| ![Pricing](./docs/screenshots/pricing.png) | 料金プラン（Stripe） |

- **デモ動画（2〜3分）**: `docs/demo.mp4`（撮影予定）

---

## 使っている技術

### フロントエンド

| カテゴリ | 採用技術 |
|----------|----------|
| フレームワーク | **Next.js 16** (App Router) / **React 19** |
| 言語 | TypeScript 5 |
| 認証 | **NextAuth 5 (beta)** |
| ORM | **Prisma 7** + PostgreSQL アダプタ |
| UI | Tailwind CSS v4 + shadcn/ui + @base-ui/react |
| グラフ | Recharts 3 |
| 決済 | Stripe (Checkout / Webhooks) |
| メール | Resend |
| デプロイ | Vercel |

### バックエンド

| カテゴリ | 採用技術 |
|----------|----------|
| 言語 | Python 3.11+ |
| フレームワーク | **FastAPI** + Pydantic v2 |
| 株価データ | yfinance |
| 数値計算 | pandas / numpy |
| AI | **Anthropic Claude API** (`claude-sonnet-*` 系) |
| HTTP | httpx (async) |
| デプロイ | Railway |

### インフラ / DB

- PostgreSQL 16（Railway 上のマネージド DB / ローカルは docker-compose）
- Vercel (フロント) ↔ Railway (API) のクロスオリジン構成

---

## アーキテクチャ

```
                ┌──────────────────────┐
                │  Browser (User)      │
                └──────────┬───────────┘
                           │ HTTPS
                ┌──────────▼───────────┐
                │  Next.js 16 (Vercel) │
                │  - App Router        │
                │  - NextAuth 5        │
                │  - Stripe Checkout   │
                │  - Prisma Client     │
                └──┬────────────────┬──┘
                   │                │
       ┌───────────▼──┐   ┌─────────▼──────────┐
       │  PostgreSQL  │   │  FastAPI (Railway) │
       │  (Railway)   │   │  - 分析エンジン     │
       │              │   │  - 売却シグナル     │
       │  users       │   │  - AI レビュー      │
       │  holdings    │   │       │            │
       │  watchlist   │   │       ▼            │
       │  sessions    │   │  yfinance / web    │
       └──────────────┘   │  Anthropic Claude  │
                          └────────────────────┘
```

- フロントは Vercel、バックエンドは Railway に分けています。FastAPI 側は `X-API-Key` で保護
- Prisma は Next.js 側からだけ DB を触り、FastAPI は **株価データの取得と分析計算に専念**
- Claude API への呼び出しは FastAPI 側でキャッシュと並列化を行います

---

## 仕組みの中身

### 1. Claude API での定性分析パイプライン

[`backend/app/services/ai_review.py`](./backend/app/services/ai_review.py)

「LLM に銘柄名を投げて答えさせる」のではなく、**先に Web 検索でファクトを集めてから Claude に構造化分析を依頼する** パイプラインにしています。

- モデルの内部知識に頼らないので、最新情報を反映しやすい
- どのソースを参照したかを `sources_summary` で残せる
- 出力は `AIReviewResult` (Pydantic) に固めてあるので、フロントで安心して扱える

#### パイプライン

```
[Ticker] ─┬─→ ニュース検索（DuckDuckGo HTML）
          ├─→ 業界動向検索
          ├─→ 企業 IR 検索
          └─→ SNS センチメント検索
                       │
                       ▼
        [収集スニペット群] ──→ Claude API (system prompt + JSON 出力)
                       │
                       ▼
        AIReviewResult {
          overall_sentiment, sentiment_score (0-100),
          summary, key_points, risk_factors,
          sns_buzz, sns_score, industry_outlook,
          sources_summary, generated_at, cached
        }
```

#### コスト / レイテンシ対策

- **6時間 TTL のインメモリキャッシュ** — 同一銘柄を続けて見たときは即返却（`cached: true`）
- **検索の並列化** — `asyncio.gather` で4種の検索を同時に走らせる
- **モデル選定** — 銘柄分析は Sonnet 系で十分というのが体感だったので、Opus は使っていません

#### 出力スキーマ

```python
class AIReviewResult(BaseModel):
    """Structured AI review for a stock."""
    ticker: str
    company_name: str
    overall_sentiment: str  # "positive" | "neutral" | "negative"
    sentiment_score: int    # 0-100
    summary: str
    key_points: list[str]
    risk_factors: list[str]
    sns_buzz: str
    sns_score: int
    industry_outlook: str
    sources_summary: str
    generated_at: str
    cached: bool = False
```

---

### 2. O'Neil 投資理論のコード実装

*How to Make Money in Stocks* (William J. O'Neil, 4th Edition) で紹介されている分析を Python で実装したものです。

#### 採用した3つの戦略

| 戦略 | ファイル | 重み | 内容 |
|------|---------|------|------|
| **CAN SLIM** | [`backend/app/services/analysis/strategies/canslim.py`](./backend/app/services/analysis/strategies/canslim.py) | **2.0** (主軸) | 7基準のうち自動採点可能な5項目 (C/A/S/L/M) |
| **カップウィズハンドル** | [`backend/app/services/analysis/strategies/cup_with_handle.py`](./backend/app/services/analysis/strategies/cup_with_handle.py) | 1.5 | O'Neil が「最も信頼できる」と書いているチャートパターン |
| **ベーシックテクニカル** | [`backend/app/services/analysis/strategies/basic_technical.py`](./backend/app/services/analysis/strategies/basic_technical.py) | 1.0 | 移動平均・モメンタム・出来高の基本指標 |

3つを **重み付きで合成したスコア** に集約してランキングしています。それぞれの戦略は `AnalysisStrategy` 抽象クラスを継承していて、Strategy パターンで差し替えできるようにしてあります（[`base.py`](./backend/app/services/analysis/base.py)）。

#### CAN SLIM の自動採点カバレッジ

```
  C  Current quarterly EPS growth  ────────────  ✅ 実装済み
  A  Annual EPS growth (3-5 yr)    ────────────  ✅ 実装済み
  N  New products / new highs      ────────────  ⏳ Phase 2 (要 NewsAPI)
  S  Supply and demand             ────────────  ✅ 実装済み (出来高サージ)
  L  Leader or laggard (RS)        ────────────  ✅ 実装済み
  I  Institutional sponsorship     ────────────  ⏳ Phase 2 (要 ownership データ)
  M  Market direction              ────────────  ✅ 実装済み (^N225 トレンド)
```

入手しづらいデータ (N, I) は Phase 2 として残しています。

#### 売却シグナル検出（O'Neil の6つのルール）

[`backend/app/services/sell_signal.py`](./backend/app/services/sell_signal.py)

『How to Make Money in Stocks』第10章「いつ売るか、損失をどう切るか」の6つのルールを実装しています:

1. **Stop-loss** — 購入価格から 7-8% 下落（O'Neil の最重要ルール）
2. **50日移動平均割れ** — 出来高を伴った下抜け
3. **Climax top** — パラボリックな急騰 → 出来高消尽
4. **RS breakdown** — Relative Strength の崩壊
5. **Distribution days** — 市場全体での機関投資家売りの蓄積
6. **Profit-taking zone** — +20〜25% の利益確定圏

それぞれに `urgent` / `warning` / `info` の3段階を付けて、ポートフォリオ全体に対して横断的に検査します。

---

### 3. その他の設計上の工夫

- **非同期並列処理** — 推薦 API は10銘柄を `asyncio.gather` で並列分析。市場データは1回だけ取得して全戦略で共有
- **責務分離** — Next.js (UI / 認証 / 決済 / DB 書き込み) ↔ FastAPI (株価 / 分析 / Claude) を明確に分ける
- **API ガード** — FastAPI は `X-API-Key` 認証で、フロントからだけ叩ける構成
- **トライアル UX** — 新規ユーザーには 7日トライアル付与（`trialEndsAt`）→ Stripe Webhook でステータス遷移
- **Cron 連携** — Vercel Cron でバックグラウンド処理（売却シグナルの定期チェック等）

---

## 主な機能

| 機能 | 説明 |
|------|------|
| 銘柄推薦ダッシュボード | 日経主要銘柄を CAN SLIM スコアでランキング |
| AI レビュー | Claude が銘柄ごとに定性評価（センチメント / リスク / SNS / 業界） |
| ポートフォリオ管理 | 保有銘柄を登録 → 6つの売却シグナルで横断チェック |
| ウォッチリスト | 気になる銘柄を保存 |
| 認証 | Email/Password + Email Magic Link (NextAuth 5) |
| サブスク課金 | Stripe Checkout + 7日トライアル + Webhook でステータス同期 |
| メール通知 | Resend 経由（トライアル終了等） |
| 特商法表示 / プライバシー / 利用規約 | SaaS 運用に必要な静的ページ完備 |

---

## ディレクトリ構成

```
stock-app/
├── frontend/                    # Next.js 16 (Vercel)
│   ├── src/app/
│   │   ├── (auth)/              # ログイン / サインアップ
│   │   ├── (dashboard)/         # ダッシュボード / ポートフォリオ / ウォッチリスト / 設定
│   │   ├── (marketing)/         # 料金 / プライバシー / 利用規約 / 特商法
│   │   └── api/                 # API Routes (auth / stripe / holdings / cron 等)
│   ├── prisma/schema.prisma     # User / Holding / Watchlist / Session
│   └── package.json
│
├── backend/                     # FastAPI (Railway)
│   ├── app/
│   │   ├── main.py              # FastAPI エントリポイント
│   │   ├── api/endpoints/       # recommendations / sell_signals / ai_review / stocks / health
│   │   ├── services/
│   │   │   ├── stock_data.py    # yfinance ラッパー
│   │   │   ├── ai_review.py     # Claude API + Web 検索パイプライン
│   │   │   ├── sell_signal.py   # O'Neil 6ルール
│   │   │   └── analysis/
│   │   │       ├── engine.py    # 戦略統合・重み付き合成
│   │   │       ├── base.py      # 戦略の抽象基底
│   │   │       └── strategies/  # CAN SLIM / カップウィズハンドル / ベーシック
│   │   └── config.py
│   ├── pyproject.toml
│   └── tests/
│
├── docker-compose.yml           # ローカル用 PostgreSQL
└── DEPLOY.md                    # 本番デプロイ手順
```

---

## ローカルで動かす

### 前提

- Node.js 20+ / pnpm
- Python 3.11+ / uv または venv
- Docker (PostgreSQL 用)
- Anthropic API キー（AI レビューを試す場合）

### 1. リポジトリの取得と依存解決

```bash
git clone https://github.com/URA-H/stocklens.git
cd stocklens

# フロント
cd frontend
pnpm install
cp .env.example .env.local      # 必要キーを記入
cd ..

# バックエンド
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env             # 必要キーを記入
cd ..
```

### 2. DB 起動・マイグレーション

```bash
docker compose up -d db
cd frontend
pnpm prisma migrate dev
```

### 3. 起動

```bash
# Terminal A: FastAPI
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal B: Next.js
cd frontend
pnpm dev
```

→ http://localhost:3000

> 詳細な環境変数一覧、Stripe テストキーの設定、Resend、Anthropic キーは `.env.example` を参照してください。

---

## 開発で詰まったところ

#### 1. Claude API の「事実誤認」をどう抑えるか

最初は「Claude にティッカーを渡して分析させる」だけのシンプルな実装でしたが、実際の決算情報と食い違うケースが頻発しました。

→ **Web 検索でファクトを集めて Claude に渡す** パイプラインに作り替え、`sources_summary` で出典を明示する設計に変更。LLM の使い方として「内部知識に頼らず、文脈として与える」の効果を実感しました。

#### 2. Next.js 16 / React 19 / Prisma 7 のリリース直後採用

リリース直後のメジャーバージョンは情報が少なく、特に App Router と Server Actions の組み合わせでよく詰まりました。

→ 公式ドキュメントと型定義に当たる習慣がつきました。フロントの `AGENTS.md` には「training data とは違うバージョンだから注意」と明記して、AI 補助も無闇に信用しないようにしています。

#### 3. 認証 × トライアル × サブスクの整合性

NextAuth 5 (beta) + Stripe Webhook + Prisma の組み合わせで、ユーザー状態の遷移（`trialing → active → past_due → expired`）を正しく扱うのに時間を割きました。

→ 状態は `User.subscriptionStatus` に一元化し、Webhook 由来の変化のみが書き換えるルールにして、**Stripe を信頼の源（source of truth）にする** 設計に落ち着きました。

#### 4. フロント / バックの責務分離

最初は Next.js 側で yfinance を叩こうとして、サーバーレス関数のコールドスタートと実行時間制限に苦しみました。

→ **重い計算と外部 API 呼び出しは FastAPI に寄せる**、Prisma の読み書きは Next.js に閉じ込めるという分離を徹底。結果として、両方のドメインに集中できて開発スピードが上がりました。

---

## 今後やりたいこと

- [ ] CAN SLIM の N (新製品/新高値) と I (機関投資家保有) の自動採点（NewsAPI / 四半期報告書スクレイピング）
- [ ] 売却シグナル検出のバックテスト基盤
- [ ] AI レビューの根拠表示（どのスニペットから何を読み取ったか）
- [ ] モバイル対応の本格化

---

## このリポジトリについて

個人開発の作品として作ったものです。Vercel / Railway 上の本番運用は現在停止していて、ローカル起動・コード閲覧・デモ動画とスクリーンショットで内容を確認できる構成にしてあります。

## ライセンス・注意事項

- 本プロジェクトは学習・個人開発目的のものです
- 表示される銘柄情報・スコアは投資判断を保証するものではありません
- 株式投資は自己責任でお願いします
