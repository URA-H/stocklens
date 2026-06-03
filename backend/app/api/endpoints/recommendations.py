import asyncio

from fastapi import APIRouter, Depends

from app.api.deps import verify_api_key
from app.services.analysis.engine import AnalysisEngine
from app.services.stock_data import StockDataService

router = APIRouter()
stock_service = StockDataService()
engine = AnalysisEngine()


@router.get("/")
async def get_recommendations(
    limit: int = 20,
    min_score: float = 0,
    _: None = Depends(verify_api_key),
):
    """Get stock recommendations sorted by composite score."""
    # Sample tickers for MVP — will be expanded
    sample_tickers = [
        "7203.T",  # トヨタ
        "6758.T",  # ソニー
        "9984.T",  # ソフトバンクG
        "8306.T",  # 三菱UFJ
        "4063.T",  # 信越化学
        "6861.T",  # キーエンス
        "9433.T",  # KDDI
        "6501.T",  # 日立製作所
        "7741.T",  # HOYA
        "8035.T",  # 東京エレクトロン
    ]

    # Pre-fetch market data once (shared across all tickers)
    market_data = await engine._fetch_market_data()

    # Fetch price data for all tickers in parallel
    price_tasks = [
        stock_service.get_price_history(ticker, "1y") for ticker in sample_tickers
    ]
    price_results = await asyncio.gather(*price_tasks)

    # Run analysis for all tickers in parallel
    analysis_tasks = []
    valid_tickers = []
    for ticker, data in zip(sample_tickers, price_results):
        if data is not None:
            valid_tickers.append(ticker)
            analysis_tasks.append(
                engine.run(ticker, data, market_data=market_data)
            )

    analysis_results = await asyncio.gather(*analysis_tasks, return_exceptions=True)

    results = []
    for result in analysis_results:
        if hasattr(result, "score") and result.score >= min_score:
            results.append(result.model_dump())

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]
