# StockLens

> 日本株向けのAI銘柄分析SaaS。William O'Neil方式（CAN SLIM・カップウィズハンドル・売却6ルール）と Claude API を組み合わせ、「数値の根拠」と「定性的な見立て」を両輪で提供する。

[![Tech: Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Tech: React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tech: FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![Tech: Claude API](https://img.shields.io/badge/Anthropic-Claude-cc785c)](https://www.anthropic.com/)
[![Tech: Prisma 7](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io/)

> **本リポジトリの位置付け**: 個人開発のポートフォリオ作品。Vercel/Railway 上での本番運用は停止しており、ローカル起動・コード閲覧・デモ動画・スクリーンショットで内容を確認できる構成です。

---

## 目次

- [概要](#概要)
- [スクリーンショット / デモ動画](#スクリーンショット--デモ動画)
- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [技術的な見せ場](#技術的な見せ場)
  - [1. Claude API を使った定性レビュー設計](#1-claude-api-を使った定性レビュー設計)
  - [2. O'Neil 投資理論のコード実装](#2-oneil-投資理論のコード実装)
  - [3. その他の設計上の工夫](#3-その他の設計上の工夫)
- [主な機能](#主な機能)
- [ディレクトリ構成](#ディレクトリ構成)
- [ローカル起動手順](#ローカル起動手順)
- [苦労したポイントと学び](#苦労したポイントと学び)
- [今後やりたいこと](#今後やりたいこと)

---

## 概要

**StockLens** は、日本株の個別銘柄を「定量×定性」の両面から評価する Web アプリケーションです。

- **定量側**: William O'Neil の名著 *How to Make Money in Stocks* に基づく **CAN SLIM** スコアリング、**カップウィズハンドル** パターン検出、**6つの売却ルール** をスクラッチで実装
- **定性側**: **Claude API + Web 検索** で、ニュース・業界動向・SNS センチメント・IR 情報を収集し、構造化された AI レビューを生成
- **継続利用想定**: NextAuth による認証、Stripe による 7日トライアル → サブスク課金、特商法表示までを含む SaaS としての一通りの構成

**狙い**: 単なる株価表示ツールではなく、「**なぜこの銘柄なのか**」を説明できるダッシュボードを目指しました。

---

## スクリーンショット / デモ動画

> 本番運用は停止中のため、以下のスクリーンショットとデモ動画で機能を確認できます。

| 画面 | 説明 |
|------|------|
| ![Dashboard](./docs/screenshots/dashboard.png) | ダッシュボード（推奨銘柄ランキング） |
| ![AI Review](./docs/screenshots/ai-review.png) | AI レビュー（Claude による定性分析） |
| ![Portfolio](./docs/screenshots/portfolio.png) | ポートフォリオ（保有銘柄管理 + 売却シグナル） |
| ![Watchlist](./docs/screenshots/watchlist.png) | ウォッチリスト |
| ![Pricing](./docs/screenshots/pricing.png) | 料金プラン（Stripe） |

- **デモ動画（2〜3分）**: `docs/demo.mp4`（撮影予定）

---

## 技術スタック

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
| デプロイ | Vercel（停止中） |

### バックエンド

| カテゴリ | 採用技術 |
|----------|----------|
| 言語 | Python 3.11+ |
| フレームワーク | **FastAPI** + Pydantic v2 |
| 株価データ | yfinance |
| 数値計算 | pandas / numpy |
| AI | **Anthropic Claude API** (`claude-sonnet-*` 系) |
| HTTP | httpx (async) |
| デプロイ | Railway（停止中） |

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

- フロントは Vercel、バックエンドは Railway に分離。API は `X-API-Key` で保護
- Prisma は Next.js 側からのみ DB を触り、FastAPI は **株価データと分析計算に専念**（責務分離）
- Claude API への重い呼び出しは FastAPI 側でキャッシュ・並列化

---

## 技術的な見せ場

### 1. Claude API を使った定性レビュー設計

[`backend/app/services/ai_review.py`](./backend/app/services/ai_review.py)

採用評価の観点で一番見ていただきたい箇所です。

#### 設計思想

「LLM に銘柄を聞いて答えさせる」のではなく、**Web 検索でファクトを集めてから Claude に構造化分析を依頼する** パイプラインを組みました。これにより:

- **ハルシネーション低減** — モデルの内部知識に依存せず、最新情報をプロンプトで与える
- **出典の透明性** — どのソースを参照したかを `sources_summary` フィールドで明示
- **構造化された出力** — `AIReviewResult` (Pydantic) に厳密にスキーマ定義

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

#### コスト/レイテンシ対策

- **6時間 TTL のインメモリキャッシュ** — 同一銘柄の連続アクセスは即返却（`cached: true`）
- **検索の並列化** — `asyncio.gather` で4種の検索を並走
- **モデル選定** — 個別銘柄分析は Sonnet 系で十分と判断（Opus はコストが見合わない）

#### コードの抜粋

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

> *How to Make Money in Stocks* (William J. O'Neil, 4th Edition) の理論を、Python でゼロから実装しました。「読んだ本を実装に落とせる」ことの証明として用意した部分です。

#### 採用した3つの戦略

| 戦略 | ファイル | 重み | 内容 |
|------|---------|------|------|
| **CAN SLIM** | [`backend/app/services/analysis/strategies/canslim.py`](./backend/app/services/analysis/strategies/canslim.py) | **2.0** (主軸) | 7基準のうち自動採点可能な5項目 (C/A/S/L/M) を実装 |
| **カップウィズハンドル** | [`backend/app/services/analysis/strategies/cup_with_handle.py`](./backend/app/services/analysis/strategies/cup_with_handle.py) | 1.5 | O'Neil が「最も信頼性が高い」と評するチャートパターンを検出 |
| **ベーシックテクニカル** | [`backend/app/services/analysis/strategies/basic_technical.py`](./backend/app/services/analysis/strategies/basic_technical.py) | 1.0 | 移動平均・モメンタム・ボリュームの基本指標 |

3つを **重み付き合成スコア** に集約し、ランキング表示します。各戦略は `AnalysisStrategy` 抽象クラスを継承し、Strategy パターンで差し替え可能にしてあります（[`base.py`](./backend/app/services/analysis/base.py)）。

#### CAN SLIM 自動採点の対応状況

```
  C  Current quarterly EPS growth  ────────────  ✅ 実装済み
  A  Annual EPS growth (3-5 yr)    ────────────  ✅ 実装済み
  N  New products / new highs      ────────────  ⏳ Phase 2 (要 NewsAPI)
  S  Supply and demand             ────────────  ✅ 実装済み (出来高サージ)
  L  Leader or laggard (RS)        ────────────  ✅ 実装済み
  I  Institutional sponsorship     ────────────  ⏳ Phase 2 (要 ownership データ)
  M  Market direction              ────────────  ✅ 実装済み (^N225 トレンド)
```

> **意図的な「未実装」の明示**: 入手しづらいデータ (N, I) は誇張せず Phase 2 として明記。「フルカバーしている」と誤認させない設計を選びました。

#### 売却シグナル検出（O'Neil の6つのルール）

[`backend/app/services/sell_signal.py`](./backend/app/services/sell_signal.py)

『How to Make Money in Stocks』第10章「いつ売るか、損失をどう切るか」に基づく6つの売却シグナルを実装:

1. **Stop-loss** — 購入価格から 7-8% 下落（O'Neil の最重要ルール）
2. **50日移動平均割れ** — 出来高を伴った下抜け
3. **Climax top** — パラボリックな急騰 → 出来高消尽
4. **RS breakdown** — Relative Strength の崩壊
5. **Distribution days** — 市場全体の機関投資家売り蓄積
6. **Profit-taking zone** — +20〜25% の利益確定圏到達

各シグナルに `urgent` / `warning` / `info` の3段階の重要度を付与し、ユーザーのポートフォリオに対して横断的に検査します。

---

### 3. その他の設計上の工夫

- **非同期並列処理** — 推薦API は10銘柄を `asyncio.gather` で並列分析。市場データは1回だけ取得して全戦略で共有
- **責務分離** — Next.js (UI / 認証 / 決済 / DB 書き込み) ↔ FastAPI (株価 / 分析 / Claude) を明確に分離
- **API ガード** — FastAPI は `X-API-Key` ベースの認証で、フロントからのみ叩ける構成
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
| サブスク課金 | Stripe Checkout + 7日トライアル + Webhook によるステータス同期 |
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
│   │   │   ├── ai_review.py     # ★ Claude API + Web 検索パイプライン
│   │   │   ├── sell_signal.py   # ★ O'Neil 6ルール
│   │   │   └── analysis/
│   │   │       ├── engine.py    # ★ 戦略統合・重み付き合成
│   │   │       ├── base.py      # 戦略の抽象基底
│   │   │       └── strategies/  # ★ CAN SLIM / カップウィズハンドル / ベーシック
│   │   └── config.py
│   ├── pyproject.toml
│   └── tests/
│
├── docker-compose.yml           # ローカル用 PostgreSQL
└── DEPLOY.md                    # 本番デプロイ手順（停止中のため参考）
```

★ は技術的見せ場。

---

## ローカル起動手順

> 本番環境は停止していますが、ローカルで一通り動かせます。

### 前提

- Node.js 20+ / pnpm
- Python 3.11+ / uv または venv
- Docker (PostgreSQL 用)
- Anthropic API キー（AIレビュー機能を試す場合）

### 1. リポジトリの取得と依存解決

```bash
git clone https://github.com/<your-account>/stock-app.git
cd stock-app

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

## 苦労したポイントと学び

#### 1. Claude API の「事実誤認」をどう抑えるか

最初は「Claude にティッカーを渡して分析させる」だけのシンプルな実装でしたが、実際の決算情報と食い違うケースが頻発しました。

→ **Web 検索でファクトを集めて Claude に渡す** パイプラインに作り替え、`sources_summary` で出典を明示する設計に変更。LLM の使い方として「内部知識に頼らず、文脈として与える」の重要性を体感しました。

#### 2. Next.js 16 / React 19 / Prisma 7 のリリース直後採用

リリース直後のメジャーバージョンは情報が少なく、特に App Router と Server Actions の組み合わせで詰まりました。

→ 公式ドキュメントと型定義を読み込んで一次情報に当たる習慣がつきました。フロントの `AGENTS.md` に「training data とは違う」と明記して、AI 補助も無闇に信用しない方針に。

#### 3. 認証 × トライアル × サブスクの整合性

NextAuth 5 (beta) + Stripe Webhook + Prisma の組み合わせで、ユーザー状態の遷移（`trialing → active → past_due → expired`）を正しく扱うのに時間を割きました。

→ 状態を `User.subscriptionStatus` に一元化し、Webhook 由来の状態変化のみが書き換えるという「**Stripe を信頼の源（source of truth）にする**」設計に整理。

#### 4. フロント/バックの責務分離

最初は Next.js 側で yfinance を叩こうとして、サーバーレス関数のコールドスタートと実行時間制限に苦しみました。

→ **重い計算と外部 API 呼び出しは FastAPI に寄せる**、Prisma の読み書きは Next.js に閉じ込めるという分離を徹底。結果として、両方のドメインに集中できて開発スピードが上がりました。

---

## 今後やりたいこと

- [ ] CAN SLIM の N (新製品/新高値) と I (機関投資家保有) の自動採点（NewsAPI / 四半期報告書スクレイピング）
- [ ] 売却シグナル検出のバックテスト基盤
- [ ] AI レビューの根拠表示（どのスニペットから何を読み取ったか）
- [ ] モバイル対応の本格化

---

## ライセンス・注意事項

- 本プロジェクトは学習・ポートフォリオ目的の個人開発です
- 表示される銘柄情報・スコアは投資判断を保証するものではありません
- 株式投資は自己責任で行ってください
