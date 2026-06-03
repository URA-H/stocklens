"""
AI Review Service — generates qualitative stock analysis using Claude API.

Gathers information from multiple sources (news, industry, company IR, SNS sentiment)
via web search, then synthesizes a structured review using Claude.
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field

import httpx
from anthropic import AsyncAnthropic
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# ── Response Models ─────────────────────────────────────────────────────


class AIReviewResult(BaseModel):
    """Structured AI review for a stock."""

    ticker: str
    company_name: str
    overall_sentiment: str  # "positive" | "neutral" | "negative"
    sentiment_score: int  # 0-100
    summary: str  # 2-3 sentence overview
    key_points: list[str]  # 3 notable points
    risk_factors: list[str]  # risk items
    sns_buzz: str  # SNS sentiment summary
    sns_score: int  # 0-100 SNS attention level
    industry_outlook: str  # industry trend summary
    sources_summary: str  # what sources were consulted
    generated_at: str  # ISO timestamp
    cached: bool = False


# ── In-Memory Cache ─────────────────────────────────────────────────────

_review_cache: dict[str, tuple[float, AIReviewResult]] = {}
CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours


def _get_cached(ticker: str) -> AIReviewResult | None:
    if ticker in _review_cache:
        ts, result = _review_cache[ticker]
        if time.time() - ts < CACHE_TTL_SECONDS:
            result.cached = True
            return result
        del _review_cache[ticker]
    return None


def _set_cache(ticker: str, result: AIReviewResult) -> None:
    _review_cache[ticker] = (time.time(), result)


# ── Search Client ───────────────────────────────────────────────────────


@dataclass
class SearchResult:
    title: str
    snippet: str
    url: str


class WebSearchClient:
    """Searches for stock-related news and information.

    Uses DuckDuckGo HTML search as a free, no-API-key search method.
    Can be swapped for Google Custom Search / Bing API for production.
    """

    def __init__(self):
        self._client = httpx.AsyncClient(
            timeout=15.0,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; StockLens/1.0)",
            },
        )

    async def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        """Search the web for a query and return structured results."""
        try:
            resp = await self._client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
            )
            resp.raise_for_status()
            return self._parse_ddg_html(resp.text, max_results)
        except Exception:
            logger.warning("Web search failed for query: %s", query, exc_info=True)
            return []

    def _parse_ddg_html(self, html: str, max_results: int) -> list[SearchResult]:
        """Parse DuckDuckGo HTML results (basic parser, no BS4 dependency)."""
        results = []
        # Simple extraction of result snippets from DDG HTML
        parts = html.split('class="result__body"')
        for part in parts[1 : max_results + 1]:
            title = ""
            snippet = ""
            url = ""

            # Extract title
            title_start = part.find('class="result__a"')
            if title_start != -1:
                tag_end = part.find(">", title_start)
                close = part.find("</a>", tag_end)
                if tag_end != -1 and close != -1:
                    title = part[tag_end + 1 : close].strip()
                    title = self._strip_tags(title)

            # Extract snippet
            snip_start = part.find('class="result__snippet"')
            if snip_start != -1:
                tag_end = part.find(">", snip_start)
                close = part.find("</a>", tag_end)
                if close == -1:
                    close = part.find("</span>", tag_end)
                if tag_end != -1 and close != -1:
                    snippet = part[tag_end + 1 : close].strip()
                    snippet = self._strip_tags(snippet)

            # Extract URL
            href_start = part.find('href="//duckduckgo.com/l/?uddg=')
            if href_start != -1:
                href_end = part.find('"', href_start + 6)
                url = part[href_start + 6 : href_end]

            if title or snippet:
                results.append(SearchResult(title=title, snippet=snippet, url=url))

        return results

    @staticmethod
    def _strip_tags(text: str) -> str:
        """Remove HTML tags from text."""
        import re

        return re.sub(r"<[^>]+>", "", text).strip()


# ── AI Review Service ───────────────────────────────────────────────────


class AIReviewService:
    """Generates AI-powered stock reviews by gathering web data and analyzing with Claude."""

    def __init__(self):
        self._search = WebSearchClient()
        self._client: AsyncAnthropic | None = None

    def _get_client(self) -> AsyncAnthropic:
        if self._client is None:
            api_key = settings.anthropic_api_key
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY is not configured")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    async def generate_review(
        self, ticker: str, company_name: str
    ) -> AIReviewResult:
        """Generate a comprehensive AI review for a stock.

        1. Search for latest news, industry trends, company IR, SNS buzz
        2. Send gathered context to Claude for structured analysis
        3. Cache the result for 6 hours
        """
        # Check cache first
        cached = _get_cached(ticker)
        if cached:
            return cached

        # Gather information from multiple angles in parallel
        search_tasks = self._build_search_queries(ticker, company_name)
        search_results = await asyncio.gather(*search_tasks)

        # Flatten and organize search results by category
        context = self._organize_search_results(
            search_results, company_name, ticker
        )

        # Generate AI analysis
        review = await self._analyze_with_claude(ticker, company_name, context)

        # Cache the result
        _set_cache(ticker, review)

        return review

    def _build_search_queries(
        self, ticker: str, company_name: str
    ) -> list:
        """Build parallel search tasks for different information categories."""
        queries = [
            # World affairs / macro
            f"{company_name} 最新ニュース 2026",
            # Industry trends
            f"{company_name} 業界動向 トレンド",
            # Company IR / earnings
            f"{company_name} 決算 業績 IR",
            # SNS / investor sentiment
            f"{company_name} 株 投資家 評判",
            # Risks
            f"{company_name} リスク 懸念",
        ]
        return [self._search.search(q, max_results=4) for q in queries]

    def _organize_search_results(
        self,
        results: list[list[SearchResult]],
        company_name: str,
        ticker: str,
    ) -> str:
        """Organize search results into a structured context string."""
        categories = [
            "最新ニュース",
            "業界動向",
            "企業IR・決算",
            "SNS・投資家センチメント",
            "リスク要因",
        ]

        sections = []
        for category, category_results in zip(categories, results):
            items = []
            for r in category_results:
                if r.title or r.snippet:
                    items.append(f"- {r.title}: {r.snippet}")
            if items:
                sections.append(f"### {category}\n" + "\n".join(items))
            else:
                sections.append(f"### {category}\n- 情報なし")

        return "\n\n".join(sections)

    async def _analyze_with_claude(
        self,
        ticker: str,
        company_name: str,
        context: str,
    ) -> AIReviewResult:
        """Send gathered information to Claude for structured analysis."""
        client = self._get_client()

        system_prompt = """あなたは日本株の投資分析AIアシスタントです。
収集された最新情報に基づいて、銘柄の定性分析レビューを生成してください。

重要なルール:
- 客観的なデータと事実に基づいて分析すること
- 投資助言ではなく、情報の整理と分析であることを念頭に置くこと
- 日本語で回答すること
- JSON形式で構造化された回答を返すこと"""

        user_prompt = f"""以下の情報に基づいて、{company_name}（{ticker}）の定性分析レビューを生成してください。

## 収集された最新情報
{context}

## 出力形式（JSON）
以下のJSON形式で回答してください。他の文章は不要です。
{{
  "overall_sentiment": "positive" または "neutral" または "negative",
  "sentiment_score": 0〜100の数値（50が中立、高いほどポジティブ）,
  "summary": "2〜3文の総合評価",
  "key_points": ["注目ポイント1", "注目ポイント2", "注目ポイント3"],
  "risk_factors": ["リスク1", "リスク2"],
  "sns_buzz": "SNS・投資家の反応の要約（1〜2文）",
  "sns_score": 0〜100の数値（注目度。50が平均、高いほど話題）,
  "industry_outlook": "業界の見通し（1〜2文）"
}}"""

        try:
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # Parse the response
            text = response.content[0].text.strip()
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            data = json.loads(text)

            from datetime import datetime, timezone

            return AIReviewResult(
                ticker=ticker,
                company_name=company_name,
                overall_sentiment=data.get("overall_sentiment", "neutral"),
                sentiment_score=max(0, min(100, data.get("sentiment_score", 50))),
                summary=data.get("summary", "分析情報を取得できませんでした"),
                key_points=data.get("key_points", [])[:5],
                risk_factors=data.get("risk_factors", [])[:5],
                sns_buzz=data.get("sns_buzz", "SNS情報なし"),
                sns_score=max(0, min(100, data.get("sns_score", 50))),
                industry_outlook=data.get("industry_outlook", "業界情報なし"),
                sources_summary=f"ニュース・IR・SNS等から{sum(len(r) for r in [context])}文字の情報を収集",
                generated_at=datetime.now(timezone.utc).isoformat(),
            )

        except json.JSONDecodeError:
            logger.error("Failed to parse Claude response as JSON", exc_info=True)
            return self._fallback_result(ticker, company_name)
        except Exception:
            logger.error("Claude API call failed", exc_info=True)
            return self._fallback_result(ticker, company_name)

    @staticmethod
    def _fallback_result(ticker: str, company_name: str) -> AIReviewResult:
        from datetime import datetime, timezone

        return AIReviewResult(
            ticker=ticker,
            company_name=company_name,
            overall_sentiment="neutral",
            sentiment_score=50,
            summary="AI分析を実行できませんでした。しばらく経ってから再度お試しください。",
            key_points=["情報取得エラー"],
            risk_factors=["分析データ不足"],
            sns_buzz="SNS情報を取得できませんでした",
            sns_score=50,
            industry_outlook="業界情報を取得できませんでした",
            sources_summary="情報収集に失敗",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
