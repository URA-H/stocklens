"""
Sell Signal Detection Service — O'Neil's Selling Rules.

Based on "How to Make Money in Stocks" (4th Ed.), Chapter 10:
"When to Sell and Cut Your Losses"

Detects 6 key sell signals:
1. Stop-loss: 7-8% below purchase price (O'Neil's #1 rule)
2. Break below 50-day MA on heavy volume
3. Climax top: parabolic rise + exhaustion on volume
4. RS (Relative Strength) breakdown
5. Distribution days accumulating in the market
6. Profit-taking zone: +20-25% gain from purchase

Each signal has a severity level:
- urgent: Immediate action suggested (stop-loss, climax top)
- warning: Conditions deteriorating (MA break, RS breakdown, distribution)
- info: Informational (profit-taking zone reached)
"""

import asyncio
import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import yfinance as yf
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class SellSignal(BaseModel):
    """A single sell signal for a holding."""

    signal_type: str  # stop_loss | ma_break | climax_top | rs_breakdown | distribution | profit_taking
    severity: str  # urgent | warning | info
    title: str
    description: str
    current_price: float
    purchase_price: float
    change_pct: float  # % change from purchase


class HoldingSignalResult(BaseModel):
    """All sell signals for a single holding."""

    ticker: str
    company_name: str
    current_price: float
    purchase_price: float
    purchase_date: str
    change_pct: float
    signals: list[SellSignal]
    has_urgent: bool
    has_warning: bool
    signal_count: int


class SellSignalService:
    """Detects sell signals based on O'Neil's methodology."""

    MARKET_TICKER = "^N225"

    # Thresholds
    STOP_LOSS_PCT = -7.0       # Cut losses at 7-8%
    STOP_LOSS_SEVERE_PCT = -8.0
    MA_PERIOD = 50             # 50-day moving average
    VOLUME_SURGE_RATIO = 1.5   # Volume 50% above average
    CLIMAX_RUN_PCT = 25        # 25%+ run-up in 2-3 weeks
    PROFIT_TAKE_PCT = 20       # Consider taking profits at 20%+
    PROFIT_TAKE_HIGH_PCT = 25  # Stronger signal at 25%+

    async def check_signals(
        self,
        holdings: list[dict],
    ) -> list[HoldingSignalResult]:
        """Check sell signals for a list of holdings.

        Each holding dict: { ticker, purchase_price, purchase_date, company_name }
        """
        if not holdings:
            return []

        # Pre-fetch market data once
        market_data = await asyncio.to_thread(
            self._fetch_history, self.MARKET_TICKER, "6mo"
        )

        # Fetch all stock data in parallel
        tickers = [h["ticker"] for h in holdings]
        fetch_tasks = [
            asyncio.to_thread(self._fetch_history, t, "1y") for t in tickers
        ]
        stock_data_list = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        results = []
        for holding, data in zip(holdings, stock_data_list):
            if isinstance(data, Exception) or data is None:
                logger.warning("Failed to fetch data for %s", holding["ticker"])
                continue

            try:
                result = self._analyze_holding(holding, data, market_data)
                results.append(result)
            except Exception:
                logger.warning(
                    "Failed to analyze holding %s", holding["ticker"], exc_info=True
                )

        # Sort: urgent first, then warning, then info
        severity_order = {"urgent": 0, "warning": 1, "info": 2}
        results.sort(
            key=lambda r: (
                min(
                    (severity_order.get(s.severity, 3) for s in r.signals),
                    default=3,
                ),
                -abs(r.change_pct),
            )
        )

        return results

    def _fetch_history(self, ticker: str, period: str) -> pd.DataFrame | None:
        try:
            stock = yf.Ticker(ticker)
            df = stock.history(period=period)
            if df.empty:
                return None
            return df
        except Exception:
            logger.warning("Failed to fetch %s", ticker, exc_info=True)
            return None

    def _analyze_holding(
        self,
        holding: dict,
        data: pd.DataFrame,
        market_data: pd.DataFrame | None,
    ) -> HoldingSignalResult:
        """Run all sell signal checks on a single holding."""
        ticker = holding["ticker"]
        purchase_price = float(holding["purchase_price"])
        purchase_date = holding["purchase_date"]
        company_name = holding.get("company_name", ticker)

        close = data["Close"]
        volume = data["Volume"] if "Volume" in data.columns else None
        current_price = float(close.iloc[-1])
        change_pct = (current_price - purchase_price) / purchase_price * 100

        signals: list[SellSignal] = []

        base_kwargs = {
            "current_price": round(current_price, 2),
            "purchase_price": round(purchase_price, 2),
            "change_pct": round(change_pct, 1),
        }

        # 1. Stop-loss check
        signal = self._check_stop_loss(**base_kwargs)
        if signal:
            signals.append(signal)

        # 2. 50-day MA break on volume
        signal = self._check_ma_break(close, volume, **base_kwargs)
        if signal:
            signals.append(signal)

        # 3. Climax top
        signal = self._check_climax_top(close, volume, **base_kwargs)
        if signal:
            signals.append(signal)

        # 4. RS breakdown
        signal = self._check_rs_breakdown(data, market_data, **base_kwargs)
        if signal:
            signals.append(signal)

        # 5. Distribution days
        signal = self._check_distribution(market_data, **base_kwargs)
        if signal:
            signals.append(signal)

        # 6. Profit-taking zone
        signal = self._check_profit_taking(**base_kwargs)
        if signal:
            signals.append(signal)

        has_urgent = any(s.severity == "urgent" for s in signals)
        has_warning = any(s.severity == "warning" for s in signals)

        return HoldingSignalResult(
            ticker=ticker,
            company_name=company_name,
            current_price=round(current_price, 2),
            purchase_price=round(purchase_price, 2),
            purchase_date=purchase_date,
            change_pct=round(change_pct, 1),
            signals=signals,
            has_urgent=has_urgent,
            has_warning=has_warning,
            signal_count=len(signals),
        )

    # ─── Signal 1: Stop-Loss (O'Neil's #1 Rule) ────────────────────────

    def _check_stop_loss(self, **kwargs) -> SellSignal | None:
        """O'Neil: ALWAYS cut losses at 7-8%. No exceptions."""
        change_pct = kwargs["change_pct"]
        if change_pct <= self.STOP_LOSS_SEVERE_PCT:
            return SellSignal(
                signal_type="stop_loss",
                severity="urgent",
                title="損切りライン到達",
                description=(
                    f"購入価格から{change_pct:+.1f}%下落しています。"
                    f"オニールの鉄則：8%以上の損失は必ず損切り。"
                    f"大きな損失を防ぐために売却を検討してください。"
                ),
                **kwargs,
            )
        elif change_pct <= self.STOP_LOSS_PCT:
            return SellSignal(
                signal_type="stop_loss",
                severity="urgent",
                title="損切りライン接近",
                description=(
                    f"購入価格から{change_pct:+.1f}%下落しています。"
                    f"オニールの7-8%ルールに到達。損切りの判断タイミングです。"
                ),
                **kwargs,
            )
        return None

    # ─── Signal 2: Break Below 50-Day MA on Heavy Volume ────────────────

    def _check_ma_break(
        self,
        close: pd.Series,
        volume: pd.Series | None,
        **kwargs,
    ) -> SellSignal | None:
        """Price closes below 50-day MA on above-average volume."""
        if len(close) < self.MA_PERIOD:
            return None

        sma50 = close.rolling(self.MA_PERIOD).mean()
        current = close.iloc[-1]
        current_sma = sma50.iloc[-1]

        if current >= current_sma:
            return None

        # Check if this is a recent break (within last 5 days)
        was_above_recently = any(
            close.iloc[i] > sma50.iloc[i]
            for i in range(-5, -1)
            if not pd.isna(sma50.iloc[i])
        )

        if not was_above_recently:
            return None  # Already been below MA for a while, not a new signal

        # Volume check
        heavy_volume = False
        if volume is not None and len(volume) >= self.MA_PERIOD:
            avg_vol = volume.rolling(self.MA_PERIOD).mean().iloc[-1]
            recent_vol = volume.iloc[-1]
            heavy_volume = recent_vol > avg_vol * self.VOLUME_SURGE_RATIO

        pct_below = (current - current_sma) / current_sma * 100

        if heavy_volume:
            return SellSignal(
                signal_type="ma_break",
                severity="warning",
                title="50日移動平均線を出来高増で下抜け",
                description=(
                    f"株価が50日移動平均線を{pct_below:.1f}%下回り、"
                    f"出来高が平均の{self.VOLUME_SURGE_RATIO}倍以上です。"
                    f"機関投資家の売りが始まっている可能性があります。"
                ),
                **kwargs,
            )
        else:
            return SellSignal(
                signal_type="ma_break",
                severity="info",
                title="50日移動平均線を下回る",
                description=(
                    f"株価が50日移動平均線を{pct_below:.1f}%下回っています。"
                    f"出来高は平常ですが、今後の推移に注意してください。"
                ),
                **kwargs,
            )

    # ─── Signal 3: Climax Top ───────────────────────────────────────────

    def _check_climax_top(
        self,
        close: pd.Series,
        volume: pd.Series | None,
        **kwargs,
    ) -> SellSignal | None:
        """Detect parabolic rise + exhaustion (O'Neil's climax run)."""
        if len(close) < 20:
            return None

        # Check for rapid run-up in the last 10-15 trading days
        for lookback in [10, 15]:
            if len(close) < lookback:
                continue

            run_up = (close.iloc[-1] - close.iloc[-lookback]) / close.iloc[-lookback] * 100

            if run_up < self.CLIMAX_RUN_PCT:
                continue

            # Check for wide price spread on the most recent day
            # (approximation: large single-day move)
            if len(close) >= 2:
                daily_change = abs(
                    (close.iloc[-1] - close.iloc[-2]) / close.iloc[-2] * 100
                )
                if daily_change < 3:
                    continue

            # Volume surge on this move
            if volume is not None and len(volume) >= 50:
                avg_vol = volume.rolling(50).mean().iloc[-1]
                if volume.iloc[-1] > avg_vol * 2:
                    return SellSignal(
                        signal_type="climax_top",
                        severity="urgent",
                        title="クライマックストップの兆候",
                        description=(
                            f"直近{lookback}日間で{run_up:.0f}%急騰し、"
                            f"出来高が平均の2倍以上。天井圏で買い疲れが"
                            f"出ている可能性があります。利益確定を検討してください。"
                        ),
                        **kwargs,
                    )

        return None

    # ─── Signal 4: RS (Relative Strength) Breakdown ─────────────────────

    def _check_rs_breakdown(
        self,
        data: pd.DataFrame,
        market_data: pd.DataFrame | None,
        **kwargs,
    ) -> SellSignal | None:
        """Stock underperforming the market significantly."""
        if market_data is None or market_data.empty:
            return None

        close = data["Close"]
        market_close = market_data["Close"]

        if len(close) < 63 or len(market_close) < 63:
            return None

        # 3-month relative performance
        stock_return = (close.iloc[-1] - close.iloc[-63]) / close.iloc[-63] * 100
        market_return = (
            (market_close.iloc[-1] - market_close.iloc[-63])
            / market_close.iloc[-63]
            * 100
        )
        rs_3m = stock_return - market_return

        # Check if RS was positive 1 month ago but now negative (breakdown)
        if len(close) >= 84 and len(market_close) >= 84:
            stock_return_prev = (
                (close.iloc[-21] - close.iloc[-84]) / close.iloc[-84] * 100
            )
            market_return_prev = (
                (market_close.iloc[-21] - market_close.iloc[-84])
                / market_close.iloc[-84]
                * 100
            )
            rs_prev = stock_return_prev - market_return_prev

            if rs_prev > 0 and rs_3m < -5:
                return SellSignal(
                    signal_type="rs_breakdown",
                    severity="warning",
                    title="相対力（RS）が崩壊",
                    description=(
                        f"市場に対する相対パフォーマンスが{rs_3m:+.1f}%に低下。"
                        f"1ヶ月前は{rs_prev:+.1f}%でリーダー圏でしたが、"
                        f"ラガードに転落しています。オニールは「リーダーを買い、"
                        f"ラガードは売る」と説いています。"
                    ),
                    **kwargs,
                )

        # Even without historical comparison, severe underperformance
        if rs_3m < -15:
            return SellSignal(
                signal_type="rs_breakdown",
                severity="warning",
                title="市場に大幅劣後",
                description=(
                    f"3ヶ月間の市場対比パフォーマンスが{rs_3m:+.1f}%。"
                    f"市場全体に対して大きく出遅れています。"
                ),
                **kwargs,
            )

        return None

    # ─── Signal 5: Distribution Days ────────────────────────────────────

    def _check_distribution(
        self, market_data: pd.DataFrame | None, **kwargs
    ) -> SellSignal | None:
        """Count distribution days in the market (O'Neil's key concept)."""
        if market_data is None or market_data.empty or len(market_data) < 25:
            return None

        if "Volume" not in market_data.columns:
            return None

        recent = market_data.iloc[-25:]
        dist_days = 0

        for i in range(1, len(recent)):
            price_change = (
                (recent["Close"].iloc[i] - recent["Close"].iloc[i - 1])
                / recent["Close"].iloc[i - 1]
                * 100
            )
            vol_increase = recent["Volume"].iloc[i] > recent["Volume"].iloc[i - 1]
            if price_change <= -0.2 and vol_increase:
                dist_days += 1

        if dist_days >= 5:
            return SellSignal(
                signal_type="distribution",
                severity="warning",
                title="市場にディストリビューション日が蓄積",
                description=(
                    f"直近25日間で{dist_days}日のディストリビューション日を検出。"
                    f"オニールは4-5日以上で市場の天井を警告しています。"
                    f"保有株全体の見直しを検討してください。"
                ),
                **kwargs,
            )
        elif dist_days >= 4:
            return SellSignal(
                signal_type="distribution",
                severity="info",
                title="市場にディストリビューション日が増加中",
                description=(
                    f"直近25日間で{dist_days}日のディストリビューション日。"
                    f"まだ警戒レベルではありませんが、注視が必要です。"
                ),
                **kwargs,
            )

        return None

    # ─── Signal 6: Profit-Taking Zone ───────────────────────────────────

    def _check_profit_taking(self, **kwargs) -> SellSignal | None:
        """O'Neil: Take most profits at 20-25% gain."""
        change_pct = kwargs["change_pct"]
        if change_pct >= self.PROFIT_TAKE_HIGH_PCT:
            return SellSignal(
                signal_type="profit_taking",
                severity="info",
                title="利益確定ゾーン到達",
                description=(
                    f"購入価格から{change_pct:+.1f}%上昇しています。"
                    f"オニールは20-25%の利益で売却し、資金を次のリーダー銘柄に"
                    f"回すことを推奨しています。一部利益確定も選択肢です。"
                ),
                **kwargs,
            )
        elif change_pct >= self.PROFIT_TAKE_PCT:
            return SellSignal(
                signal_type="profit_taking",
                severity="info",
                title="利益確定を検討するタイミング",
                description=(
                    f"購入価格から{change_pct:+.1f}%上昇。"
                    f"オニールの20-25%利益確定ルールに近づいています。"
                ),
                **kwargs,
            )

        return None
