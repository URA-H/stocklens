"""
CAN SLIM Strategy — based on William O'Neil's "How to Make Money in Stocks" (4th Ed.)

Implements 5 of the 7 CAN SLIM criteria that can be automatically scored
from publicly available data:

  C = Current quarterly earnings per share (YoY growth)
  A = Annual earnings growth (3-5 year track record)
  S = Supply and demand (volume surge + float)
  L = Leader or laggard (Relative Strength ranking)
  M = Market direction (Nikkei 225 trend)

N (New products/highs) and I (Institutional sponsorship) require
news APIs / ownership data and are planned for Phase 2.
"""

import asyncio
import logging

import numpy as np
import pandas as pd
import yfinance as yf

from app.services.analysis.base import AnalysisResult, AnalysisStrategy

logger = logging.getLogger(__name__)


class CanSlimStrategy(AnalysisStrategy):
    """CAN SLIM composite scoring strategy."""

    name = "canslim"
    weight = 2.0  # Higher weight than basic technical

    MARKET_TICKER = "^N225"

    async def analyze(
        self,
        ticker: str,
        data: pd.DataFrame,
        market_data: pd.DataFrame | None = None,
    ) -> AnalysisResult:
        stock = await asyncio.to_thread(yf.Ticker, ticker)

        # Fetch financials in parallel threads
        c_score, c_detail = await asyncio.to_thread(self._score_c, stock)
        a_score, a_detail = await asyncio.to_thread(self._score_a, stock)
        s_score, s_detail = await asyncio.to_thread(self._score_s, stock, data)
        l_score, l_detail = self._score_l(data, market_data)
        m_score, m_detail = self._score_m(market_data)

        scores = {
            "C": c_score,
            "A": a_score,
            "S": s_score,
            "L": l_score,
            "M": m_score,
        }

        weights = {"C": 25, "A": 20, "S": 15, "L": 25, "M": 15}
        composite = sum(scores[k] * weights[k] for k in scores) / sum(weights.values())
        composite = round(composite, 1)

        if composite >= 70:
            signal = "buy"
        elif composite <= 40:
            signal = "sell"
        else:
            signal = "hold"

        details = {
            "C": c_detail,
            "A": a_detail,
            "S": s_detail,
            "L": l_detail,
            "M": m_detail,
        }
        reasoning_parts = [f"{k}:{v}" for k, v in details.items() if v]
        reasoning = " / ".join(reasoning_parts)

        return AnalysisResult(
            ticker=ticker,
            score=composite,
            signal=signal,
            reasoning=reasoning,
            metadata={
                "canslim_scores": scores,
                "canslim_details": details,
                "canslim_composite": composite,
            },
        )

    # ─── C: Current Quarterly EPS Growth ───────────────────────────────

    def _score_c(self, stock: yf.Ticker) -> tuple[float, str]:
        """Score based on most recent quarterly EPS growth vs year-ago quarter."""
        try:
            quarterly = stock.quarterly_financials
            if quarterly is None or quarterly.empty:
                return 50, "四半期データなし"

            net_income = None
            for label in ["Net Income", "Net Income Common Stockholders"]:
                if label in quarterly.index:
                    net_income = quarterly.loc[label]
                    break

            if net_income is None or len(net_income) < 5:
                return 50, "四半期データ不足"

            recent = net_income.iloc[0]
            year_ago = net_income.iloc[4] if len(net_income) > 4 else net_income.iloc[-1]

            if year_ago <= 0:
                if recent > 0:
                    return 90, "赤字→黒字転換"
                return 30, "赤字継続"

            growth = (recent - year_ago) / abs(year_ago) * 100

            acceleration_bonus = 0
            if len(net_income) >= 6:
                prev_recent = net_income.iloc[1]
                prev_year_ago = (
                    net_income.iloc[5] if len(net_income) > 5 else net_income.iloc[-1]
                )
                if prev_year_ago > 0:
                    prev_growth = (
                        (prev_recent - prev_year_ago) / abs(prev_year_ago) * 100
                    )
                    if growth > prev_growth:
                        acceleration_bonus = 10

            if growth >= 50:
                score = 90 + acceleration_bonus
            elif growth >= 25:
                score = 70 + (growth - 25) * 0.8 + acceleration_bonus
            elif growth >= 10:
                score = 50 + (growth - 10) * 1.3
            elif growth >= 0:
                score = 30 + growth * 2
            else:
                score = max(0, 30 + growth * 0.5)

            score = max(0, min(100, score))
            detail = f"四半期EPS成長{growth:+.0f}%"
            if acceleration_bonus > 0:
                detail += "（加速中）"
            return round(score, 1), detail

        except Exception:
            logger.warning("Failed to score C for ticker", exc_info=True)
            return 50, "四半期データ取得エラー"

    # ─── A: Annual Earnings Growth ─────────────────────────────────────

    def _score_a(self, stock: yf.Ticker) -> tuple[float, str]:
        """Score based on annual EPS growth over 3-5 years."""
        try:
            financials = stock.financials
            if financials is None or financials.empty:
                return 50, "年次データなし"

            net_income = None
            for label in ["Net Income", "Net Income Common Stockholders"]:
                if label in financials.index:
                    net_income = financials.loc[label]
                    break

            if net_income is None or len(net_income) < 3:
                return 50, "年次データ不足"

            values = net_income.dropna().values[:5]
            if len(values) < 3:
                return 50, "年次データ不足"

            n_years = len(values) - 1
            if values[-1] > 0 and values[0] > 0:
                cagr = (values[0] / values[-1]) ** (1 / n_years) - 1
                cagr_pct = cagr * 100
            elif values[-1] <= 0 and values[0] > 0:
                return 80, f"赤字→黒字転換（{n_years}年間）"
            else:
                return 20, "利益マイナス傾向"

            growth_years = sum(
                1 for i in range(len(values) - 1) if values[i] > values[i + 1]
            )
            consistency = growth_years / (len(values) - 1)

            if cagr_pct >= 25:
                score = 85 + min(15, (cagr_pct - 25) * 0.3)
            elif cagr_pct >= 15:
                score = 65 + (cagr_pct - 15) * 2
            elif cagr_pct >= 5:
                score = 40 + (cagr_pct - 5) * 2.5
            elif cagr_pct >= 0:
                score = 30 + cagr_pct * 2
            else:
                score = max(0, 30 + cagr_pct)

            score += (consistency - 0.5) * 20

            score = max(0, min(100, score))
            detail = f"年間CAGR{cagr_pct:+.1f}%（{n_years}年間）"
            if consistency >= 0.75:
                detail += "・安定成長"
            return round(score, 1), detail

        except Exception:
            logger.warning("Failed to score A for ticker", exc_info=True)
            return 50, "年次データ取得エラー"

    # ─── S: Supply and Demand ──────────────────────────────────────────

    def _score_s(
        self, stock: yf.Ticker, data: pd.DataFrame
    ) -> tuple[float, str]:
        """Score based on volume patterns and share supply."""
        try:
            reasons = []
            score = 50.0

            if data is not None and "Volume" in data.columns and len(data) >= 20:
                volume = data["Volume"]
                close = data["Close"]
                avg_vol = (
                    volume.rolling(50).mean().iloc[-1]
                    if len(data) >= 50
                    else volume.mean()
                )
                recent_vol = volume.iloc[-5:].mean()

                vol_ratio = recent_vol / avg_vol if avg_vol > 0 else 1

                recent = data.iloc[-10:]
                up_days = recent[recent["Close"] > recent["Close"].shift(1)]
                down_days = recent[recent["Close"] <= recent["Close"].shift(1)]

                up_vol = up_days["Volume"].mean() if len(up_days) > 0 else 0
                down_vol = down_days["Volume"].mean() if len(down_days) > 0 else 1

                accumulation_ratio = up_vol / down_vol if down_vol > 0 else 1

                if vol_ratio >= 1.5:
                    score += 20
                    reasons.append(f"出来高{vol_ratio:.1f}倍増")
                elif vol_ratio >= 1.2:
                    score += 10
                    reasons.append("出来高やや増加")
                elif vol_ratio < 0.7:
                    score -= 10
                    reasons.append("出来高低迷")

                if accumulation_ratio >= 1.5:
                    score += 15
                    reasons.append("買い集め傾向")
                elif accumulation_ratio <= 0.7:
                    score -= 15
                    reasons.append("売り圧力")

            info = stock.info or {}
            float_shares = info.get("floatShares")
            shares_outstanding = info.get("sharesOutstanding")

            if float_shares and shares_outstanding and shares_outstanding > 0:
                float_ratio = float_shares / shares_outstanding
                if float_ratio < 0.3:
                    score += 10
                    reasons.append(f"浮動株比率{float_ratio:.0%}（少）")
                elif float_ratio > 0.7:
                    score -= 5
                    reasons.append(f"浮動株比率{float_ratio:.0%}（多）")

            score = max(0, min(100, score))
            detail = "・".join(reasons) if reasons else "需給データ分析中"
            return round(score, 1), detail

        except Exception:
            logger.warning("Failed to score S for ticker", exc_info=True)
            return 50, "需給データ取得エラー"

    # ─── L: Leader or Laggard (Relative Strength) ─────────────────────

    def _score_l(
        self, data: pd.DataFrame, market_data: pd.DataFrame | None
    ) -> tuple[float, str]:
        """Score based on relative price strength vs market.

        Now accepts pre-fetched market_data to avoid redundant ^N225 calls.
        """
        try:
            if data is None or len(data) < 60:
                return 50, "データ不足"

            close = data["Close"]
            returns = {}
            periods = {"3m": 63, "6m": 126, "12m": 252}

            for label, days in periods.items():
                if len(close) >= days:
                    ret = (
                        (close.iloc[-1] - close.iloc[-days])
                        / close.iloc[-days]
                        * 100
                    )
                    returns[label] = ret

            market_returns = {}
            if market_data is not None and not market_data.empty:
                market_close = market_data["Close"]
                for label, days in periods.items():
                    if len(market_close) >= days:
                        ret = (
                            (market_close.iloc[-1] - market_close.iloc[-days])
                            / market_close.iloc[-days]
                            * 100
                        )
                        market_returns[label] = ret

            rs_values = []
            for label in returns:
                stock_ret = returns[label]
                market_ret = market_returns.get(label, 0)
                rs_values.append(stock_ret - market_ret)

            if not rs_values:
                return 50, "リターン計算不可"

            if len(rs_values) == 3:
                weighted_rs = (
                    rs_values[0] * 0.40 + rs_values[1] * 0.35 + rs_values[2] * 0.25
                )
            elif len(rs_values) == 2:
                weighted_rs = rs_values[0] * 0.55 + rs_values[1] * 0.45
            else:
                weighted_rs = rs_values[0]

            if weighted_rs >= 30:
                score = 95
            elif weighted_rs >= 15:
                score = 80 + (weighted_rs - 15) * 1.0
            elif weighted_rs >= 5:
                score = 60 + (weighted_rs - 5) * 2.0
            elif weighted_rs >= 0:
                score = 50 + weighted_rs * 2.0
            elif weighted_rs >= -10:
                score = 30 + (weighted_rs + 10) * 2.0
            else:
                score = max(0, 30 + weighted_rs)

            score = max(0, min(100, score))

            stock_ret_str = (
                f"{returns.get('3m', 0):+.1f}%" if "3m" in returns else "N/A"
            )
            detail = f"RS={weighted_rs:+.1f}（3M株{stock_ret_str}）"
            if score >= 80:
                detail += "・リーダー銘柄"
            elif score <= 30:
                detail += "・ラガード銘柄"
            return round(score, 1), detail

        except Exception:
            logger.warning("Failed to score L for ticker", exc_info=True)
            return 50, "RS計算エラー"

    # ─── M: Market Direction ──────────────────────────────────────────

    def _score_m(
        self, market_data: pd.DataFrame | None
    ) -> tuple[float, str]:
        """Score based on overall market direction.

        Now accepts pre-fetched market_data to avoid redundant ^N225 calls.
        """
        try:
            if market_data is None or market_data.empty or len(market_data) < 50:
                return 50, "市場データ不足"

            close = market_data["Close"]
            volume = (
                market_data["Volume"]
                if "Volume" in market_data.columns
                else None
            )

            sma50 = close.rolling(50).mean().iloc[-1]
            sma21 = close.rolling(21).mean().iloc[-1]
            current = close.iloc[-1]

            score = 50.0
            reasons = []

            if current > sma50 and current > sma21:
                score += 20
                reasons.append("日経225がSMA50/21上")
            elif current > sma50:
                score += 10
                reasons.append("日経225がSMA50上")
            elif current < sma50 and current < sma21:
                score -= 20
                reasons.append("日経225がSMA50/21下")

            sma21_series = close.rolling(21).mean()
            if len(sma21_series.dropna()) >= 5:
                slope = (
                    (sma21_series.iloc[-1] - sma21_series.iloc[-5])
                    / sma21_series.iloc[-5]
                    * 100
                )
                if slope > 1:
                    score += 10
                    reasons.append("短期上昇トレンド")
                elif slope < -1:
                    score -= 10
                    reasons.append("短期下降トレンド")

            if volume is not None and len(market_data) >= 25:
                recent_25 = market_data.iloc[-25:]
                dist_days = 0
                for i in range(1, len(recent_25)):
                    price_change = (
                        (recent_25["Close"].iloc[i] - recent_25["Close"].iloc[i - 1])
                        / recent_25["Close"].iloc[i - 1]
                        * 100
                    )
                    vol_increase = (
                        recent_25["Volume"].iloc[i] > recent_25["Volume"].iloc[i - 1]
                    )
                    if price_change <= -0.2 and vol_increase:
                        dist_days += 1

                if dist_days >= 5:
                    score -= 20
                    reasons.append(f"ディストリビューション{dist_days}日（警戒）")
                elif dist_days >= 3:
                    score -= 10
                    reasons.append(f"ディストリビューション{dist_days}日")
                elif dist_days <= 1:
                    score += 10
                    reasons.append("市場蓄積フェーズ")

            score = max(0, min(100, score))
            detail = "・".join(reasons) if reasons else "市場分析中"
            return round(score, 1), detail

        except Exception:
            logger.warning("Failed to score M", exc_info=True)
            return 50, "市場データ取得エラー"
