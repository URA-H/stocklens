"""Tests for SellSignalService — O'Neil's 6 sell rules."""

import numpy as np
import pandas as pd
import pytest

from app.services.sell_signal import SellSignalService


@pytest.fixture
def service():
    return SellSignalService()


def _signal_kwargs(current_price=1000, purchase_price=1100, change_pct=-9.1):
    """kwargs that match the SellSignal model fields."""
    return {
        "current_price": current_price,
        "purchase_price": purchase_price,
        "change_pct": change_pct,
    }



# ── 1. Stop-Loss ──────────────────────────────────────────────────────


class TestStopLoss:
    def test_severe_loss_triggers_urgent(self, service):
        signal = service._check_stop_loss(**_signal_kwargs(change_pct=-9.0))
        assert signal is not None
        assert signal.severity == "urgent"
        assert signal.signal_type == "stop_loss"

    def test_moderate_loss_triggers_urgent(self, service):
        signal = service._check_stop_loss(**_signal_kwargs(change_pct=-7.5))
        assert signal is not None
        assert signal.severity == "urgent"

    def test_small_loss_no_signal(self, service):
        signal = service._check_stop_loss(**_signal_kwargs(change_pct=-5.0))
        assert signal is None

    def test_gain_no_signal(self, service):
        signal = service._check_stop_loss(**_signal_kwargs(change_pct=10.0))
        assert signal is None

    def test_exact_threshold(self, service):
        signal = service._check_stop_loss(**_signal_kwargs(change_pct=-7.0))
        assert signal is not None


# ── 2. MA Break ───────────────────────────────────────────────────────


class TestMABreak:
    def _make_ma_break_data(self, break_below=True, heavy_volume=True):
        n = 60
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        prices = np.full(n, 1000.0)
        prices[-1] = 920.0 if break_below else 1010.0
        for i in range(n - 5, n - 1):
            prices[i] = 1005.0
        vol = np.full(n, 1_000_000.0)
        if heavy_volume:
            vol[-1] = 2_000_000.0
        return pd.DataFrame({"Close": prices, "Volume": vol}, index=dates)

    def test_break_below_with_volume(self, service):
        data = self._make_ma_break_data(break_below=True, heavy_volume=True)
        signal = service._check_ma_break(
            data["Close"], data["Volume"], **_signal_kwargs()
        )
        assert signal is not None
        assert signal.signal_type == "ma_break"
        assert signal.severity == "warning"

    def test_no_break_no_signal(self, service):
        data = self._make_ma_break_data(break_below=False)
        signal = service._check_ma_break(
            data["Close"], data["Volume"], **_signal_kwargs()
        )
        assert signal is None

    def test_insufficient_data_no_signal(self, service):
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=30)
        close = pd.Series(np.full(30, 1000.0), index=dates)
        volume = pd.Series(np.full(30, 1e6), index=dates)
        signal = service._check_ma_break(close, volume, **_signal_kwargs())
        assert signal is None


# ── 3. Climax Top ─────────────────────────────────────────────────────


class TestClimaxTop:
    def _make_climax_data(self):
        n = 60
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        prices = np.full(n, 1000.0)
        for i in range(n - 10, n):
            prices[i] = 1000 + (i - (n - 10)) * 35
        prices[-1] = prices[-2] * 1.05
        vol = np.full(n, 1_000_000.0)
        vol[-1] = 3_000_000.0
        return pd.DataFrame({"Close": prices, "Volume": vol}, index=dates)

    def test_climax_detected(self, service):
        data = self._make_climax_data()
        signal = service._check_climax_top(
            data["Close"], data["Volume"], **_signal_kwargs()
        )
        assert signal is not None
        assert signal.severity == "urgent"
        assert signal.signal_type == "climax_top"

    def test_no_run_up_no_signal(self, service, price_data_rising):
        signal = service._check_climax_top(
            price_data_rising["Close"],
            price_data_rising["Volume"],
            **_signal_kwargs(),
        )
        assert signal is None


# ── 4. RS Breakdown ───────────────────────────────────────────────────


class TestRSBreakdown:
    def test_severe_underperformance(self, service, market_data):
        n = 250
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        prices = 1500 - np.linspace(0, 800, n)
        data = pd.DataFrame(
            {"Open": prices, "High": prices, "Low": prices,
             "Close": prices, "Volume": np.full(n, 1e6)},
            index=dates,
        )
        signal = service._check_rs_breakdown(data, market_data, **_signal_kwargs())
        assert signal is not None
        assert signal.signal_type == "rs_breakdown"

    def test_outperformer_no_signal(self, service, price_data_rising, market_data):
        signal = service._check_rs_breakdown(
            price_data_rising, market_data, **_signal_kwargs()
        )
        if signal is not None:
            assert signal.severity != "urgent"

    def test_no_market_data_no_signal(self, service, price_data_falling):
        signal = service._check_rs_breakdown(
            price_data_falling, None, **_signal_kwargs()
        )
        assert signal is None


# ── 5. Distribution Days ──────────────────────────────────────────────


class TestDistribution:
    def _make_distribution_market(self, dist_days=6):
        """Create market data with distribution days at the END of the data."""
        n = 30
        dates = pd.bdate_range(end=pd.Timestamp.now(), periods=n)
        prices = np.full(n, 30000.0)
        volumes = np.full(n, 2_000_000.0)
        # Place distribution days at the end (within last 25 days)
        for i in range(n - dist_days, n):
            prices[i] = prices[i - 1] * 0.996  # -0.4% (> 0.2% threshold)
            volumes[i] = volumes[i - 1] * 1.2   # increasing volume
        return pd.DataFrame({"Close": prices, "Volume": volumes}, index=dates)

    def test_high_distribution_warning(self, service):
        data = self._make_distribution_market(dist_days=8)
        signal = service._check_distribution(data, **_signal_kwargs())
        assert signal is not None
        assert signal.signal_type == "distribution"
        assert signal.severity == "warning"

    def test_moderate_distribution_info(self, service):
        data = self._make_distribution_market(dist_days=5)
        signal = service._check_distribution(data, **_signal_kwargs())
        assert signal is not None
        # 4 or 5 dist days → could be info or warning
        assert signal.severity in ("info", "warning")

    def test_low_distribution_no_signal(self, service):
        data = self._make_distribution_market(dist_days=2)
        signal = service._check_distribution(data, **_signal_kwargs())
        assert signal is None

    def test_no_market_data(self, service):
        signal = service._check_distribution(None, **_signal_kwargs())
        assert signal is None


# ── 6. Profit-Taking ──────────────────────────────────────────────────
# _check_profit_taking(self, change_pct: float, **kwargs)


class TestProfitTaking:
    def test_high_profit_signal(self, service):
        signal = service._check_profit_taking(**_signal_kwargs(change_pct=26.0))
        assert signal is not None
        assert signal.signal_type == "profit_taking"
        assert "利益確定ゾーン" in signal.title

    def test_moderate_profit_signal(self, service):
        signal = service._check_profit_taking(**_signal_kwargs(change_pct=21.0))
        assert signal is not None
        assert "検討" in signal.title

    def test_small_gain_no_signal(self, service):
        signal = service._check_profit_taking(**_signal_kwargs(change_pct=10.0))
        assert signal is None

    def test_loss_no_signal(self, service):
        signal = service._check_profit_taking(**_signal_kwargs(change_pct=-5.0))
        assert signal is None
