"""Tests for AnalysisEngine — orchestration and scoring logic."""

import pytest

from app.services.analysis.base import AnalysisResult, AnalysisStrategy
from app.services.analysis.engine import AnalysisEngine


class MockStrategy(AnalysisStrategy):
    """A controllable mock strategy for testing."""

    def __init__(self, name: str, weight: float, score: float, should_fail: bool = False):
        self.name = name
        self.weight = weight
        self._score = score
        self._should_fail = should_fail

    async def analyze(self, ticker, data):
        if self._should_fail:
            raise RuntimeError("Mock failure")
        signal = "buy" if self._score >= 70 else "sell" if self._score <= 40 else "hold"
        return AnalysisResult(
            ticker=ticker,
            score=self._score,
            signal=signal,
            reasoning=f"{self.name}: {self._score}",
        )


class TestAnalysisEngine:
    def _make_engine(self, strategies: list[MockStrategy]) -> AnalysisEngine:
        engine = AnalysisEngine()
        engine.strategies = []  # Clear defaults
        engine._canslim = None
        for s in strategies:
            engine.register(s)
        return engine

    @pytest.mark.asyncio
    async def test_weighted_average(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("a", weight=2.0, score=80),
            MockStrategy("b", weight=1.0, score=50),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        # Weighted: (80*2 + 50*1) / 3 = 70.0
        assert result.score == pytest.approx(70.0, abs=0.1)
        assert result.signal == "buy"

    @pytest.mark.asyncio
    async def test_hold_signal(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("a", weight=1.0, score=55),
            MockStrategy("b", weight=1.0, score=55),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        assert result.signal == "hold"

    @pytest.mark.asyncio
    async def test_sell_signal(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("a", weight=1.0, score=30),
            MockStrategy("b", weight=1.0, score=35),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        assert result.signal == "sell"
        assert result.score <= 40

    @pytest.mark.asyncio
    async def test_failed_strategy_excluded(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("good", weight=1.0, score=80),
            MockStrategy("bad", weight=1.0, score=0, should_fail=True),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        # Only good strategy counted
        assert result.score == pytest.approx(80.0, abs=0.1)
        assert len(result.strategies) == 1

    @pytest.mark.asyncio
    async def test_all_strategies_fail(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("bad1", weight=1.0, score=0, should_fail=True),
            MockStrategy("bad2", weight=1.0, score=0, should_fail=True),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        assert result.score == 50  # Fallback
        assert result.signal == "hold"
        assert len(result.strategies) == 0

    @pytest.mark.asyncio
    async def test_no_strategies(self, price_data_rising):
        engine = self._make_engine([])
        result = await engine.run("TEST.T", price_data_rising)
        assert result.score == 50
        assert result.signal == "hold"

    @pytest.mark.asyncio
    async def test_single_strategy(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("only", weight=1.0, score=85),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        assert result.score == pytest.approx(85.0, abs=0.1)
        assert result.signal == "buy"

    @pytest.mark.asyncio
    async def test_reasoning_combined(self, price_data_rising):
        engine = self._make_engine([
            MockStrategy("alpha", weight=1.0, score=60),
            MockStrategy("beta", weight=1.0, score=70),
        ])
        result = await engine.run("TEST.T", price_data_rising)
        assert "alpha" in result.reasoning
        assert "beta" in result.reasoning
