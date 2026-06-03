"""Tests for CAN SLIM scoring — L (Relative Strength) and M (Market Direction).

C, A, S require yfinance Ticker objects; tested via integration tests.
L and M accept raw DataFrames and are testable in isolation.
"""

import numpy as np
import pandas as pd
import pytest

from app.services.analysis.strategies.canslim import CanSlimStrategy


@pytest.fixture
def strategy():
    return CanSlimStrategy()


# ── L: Leader or Laggard ──────────────────────────────────────────────


class TestScoreL:
    def test_strong_outperformer(self, strategy, market_data):
        """Stock rising faster than market → high L score."""
        n = 250
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        # Stock doubles while market rises ~10%
        prices = 1000 + np.linspace(0, 1000, n)
        data = pd.DataFrame({"Close": prices}, index=dates)

        score, detail = strategy._score_l(data, market_data)
        assert score >= 70
        assert "リーダー" in detail or "RS=" in detail

    def test_underperformer(self, strategy, market_data):
        """Stock falling while market rises → low L score."""
        n = 250
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        prices = 1000 - np.linspace(0, 400, n)
        data = pd.DataFrame({"Close": prices}, index=dates)

        score, detail = strategy._score_l(data, market_data)
        assert score <= 40

    def test_market_matching(self, strategy, market_data):
        """Stock matching market returns → mid L score."""
        # Use market data itself as stock data
        score, detail = strategy._score_l(market_data, market_data)
        assert 40 <= score <= 70

    def test_no_market_data(self, strategy, price_data_rising):
        score, detail = strategy._score_l(price_data_rising, None)
        # Without market data, RS is just the stock return
        assert 0 <= score <= 100

    def test_insufficient_data(self, strategy):
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=30)
        data = pd.DataFrame({"Close": np.full(30, 1000.0)}, index=dates)
        score, detail = strategy._score_l(data, None)
        assert score == 50
        assert "データ不足" in detail


# ── M: Market Direction ───────────────────────────────────────────────


class TestScoreM:
    def _make_market_data(self, trend="up", dist_days=0):
        n = 60
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        if trend == "up":
            prices = 30000 + np.linspace(0, 3000, n)
        elif trend == "down":
            prices = 33000 - np.linspace(0, 5000, n)
        else:
            prices = np.full(n, 30000.0)

        volumes = np.full(n, 2_000_000.0)
        # Add distribution days at the END (within last 25 days)
        for i in range(n - dist_days, n):
            prices[i] = prices[i - 1] * 0.996  # -0.4%
            volumes[i] = volumes[i - 1] * 1.2   # increasing vol

        return pd.DataFrame(
            {"Close": prices, "Volume": volumes},
            index=dates,
        )

    def test_bullish_market(self, strategy):
        data = self._make_market_data(trend="up")
        score, detail = strategy._score_m(data)
        assert score >= 60
        assert any(word in detail for word in ["上", "トレンド", "蓄積"])

    def test_bearish_market(self, strategy):
        data = self._make_market_data(trend="down")
        score, detail = strategy._score_m(data)
        assert score <= 45

    def test_distribution_heavy_market(self, strategy):
        data = self._make_market_data(trend="up", dist_days=6)
        score, detail = strategy._score_m(data)
        # Distribution days should lower the score
        assert "ディストリビューション" in detail

    def test_no_market_data(self, strategy):
        score, detail = strategy._score_m(None)
        assert score == 50
        assert "市場データ不足" in detail

    def test_score_bounds(self, strategy, market_data):
        score, _ = strategy._score_m(market_data)
        assert 0 <= score <= 100
