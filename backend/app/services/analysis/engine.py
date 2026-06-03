import asyncio
import logging

import pandas as pd
from pydantic import BaseModel

from app.services.analysis.base import AnalysisResult, AnalysisStrategy
from app.services.analysis.strategies.basic_technical import BasicTechnicalStrategy
from app.services.analysis.strategies.canslim import CanSlimStrategy
from app.services.analysis.strategies.cup_with_handle import CupWithHandleStrategy
from app.services.stock_data import StockDataService

logger = logging.getLogger(__name__)


class CompositeResult(BaseModel):
    """Composite result from all strategies."""

    ticker: str
    score: float
    signal: str
    strategies: list[AnalysisResult]
    reasoning: str


class AnalysisEngine:
    """Orchestrates multiple analysis strategies and produces a composite score."""

    def __init__(self):
        self.strategies: list[AnalysisStrategy] = []
        self._canslim: CanSlimStrategy | None = None
        self._stock_service = StockDataService()
        self._register_defaults()

    def _register_defaults(self):
        """Register default strategies."""
        self._canslim = CanSlimStrategy()
        self.register(self._canslim)               # weight=2.0 (primary)
        self.register(BasicTechnicalStrategy())     # weight=1.0
        self.register(CupWithHandleStrategy())      # weight=1.5

    def register(self, strategy: AnalysisStrategy):
        """Register a new analysis strategy."""
        self.strategies.append(strategy)

    async def _fetch_market_data(self) -> pd.DataFrame | None:
        """Fetch market data once for all strategies that need it."""
        return await self._stock_service.get_market_data("^N225", "1y")

    async def run(
        self,
        ticker: str,
        data: pd.DataFrame,
        market_data: pd.DataFrame | None = None,
    ) -> CompositeResult:
        """Run all strategies and compute composite score.

        market_data is pre-fetched ^N225 data shared across all tickers.
        """
        if not self.strategies:
            return CompositeResult(
                ticker=ticker,
                score=50,
                signal="hold",
                strategies=[],
                reasoning="分析戦略が登録されていません",
            )

        # Build tasks — pass market_data to CAN SLIM strategy
        tasks = []
        for s in self.strategies:
            if isinstance(s, CanSlimStrategy):
                tasks.append(s.analyze(ticker, data, market_data=market_data))
            else:
                tasks.append(s.analyze(ticker, data))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_pairs: list[tuple[AnalysisResult, AnalysisStrategy]] = []

        for result, strategy in zip(results, self.strategies):
            if isinstance(result, AnalysisResult):
                valid_pairs.append((result, strategy))
            else:
                logger.warning(
                    "Strategy %s failed for %s: %s",
                    strategy.name,
                    ticker,
                    result,
                )

        if not valid_pairs:
            return CompositeResult(
                ticker=ticker,
                score=50,
                signal="hold",
                strategies=[],
                reasoning="分析に失敗しました",
            )

        valid_results = [r for r, _ in valid_pairs]
        total_weight = sum(s.weight for _, s in valid_pairs)

        # Weighted average score
        weighted_score = sum(
            r.score * s.weight for r, s in valid_pairs
        ) / total_weight

        # Determine signal
        if weighted_score >= 70:
            signal = "buy"
        elif weighted_score <= 40:
            signal = "sell"
        else:
            signal = "hold"

        reasoning = " / ".join(r.reasoning for r in valid_results)

        return CompositeResult(
            ticker=ticker,
            score=round(weighted_score, 1),
            signal=signal,
            strategies=valid_results,
            reasoning=reasoning,
        )
