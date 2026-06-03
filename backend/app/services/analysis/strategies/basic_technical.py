import pandas as pd

from app.services.analysis.base import AnalysisResult, AnalysisStrategy


class BasicTechnicalStrategy(AnalysisStrategy):
    """Basic technical analysis using moving averages and RSI."""

    name = "basic_technical"
    weight = 1.0

    async def analyze(self, ticker: str, data: pd.DataFrame) -> AnalysisResult:
        if data is None or len(data) < 20:
            return AnalysisResult(
                ticker=ticker,
                score=50,
                signal="hold",
                reasoning="データ不足",
            )

        close = data["Close"]
        score = 50.0
        reasons = []

        # Moving average crossover (SMA 5 vs SMA 20)
        sma5 = close.rolling(5).mean()
        sma20 = close.rolling(20).mean()

        if sma5.iloc[-1] > sma20.iloc[-1]:
            score += 15
            reasons.append("短期MA>長期MA（上昇トレンド）")
        else:
            score -= 10
            reasons.append("短期MA<長期MA（下降トレンド）")

        # Price vs SMA20
        if close.iloc[-1] > sma20.iloc[-1]:
            score += 10
            reasons.append("株価がSMA20を上回り")
        else:
            score -= 10
            reasons.append("株価がSMA20を下回り")

        # RSI (14-period)
        delta = close.diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]

        if current_rsi < 30:
            score += 15
            reasons.append(f"RSI={current_rsi:.0f}（売られすぎ）")
        elif current_rsi > 70:
            score -= 15
            reasons.append(f"RSI={current_rsi:.0f}（買われすぎ）")
        else:
            reasons.append(f"RSI={current_rsi:.0f}（中立）")

        # Momentum (5-day return)
        if len(close) >= 5:
            momentum = (close.iloc[-1] - close.iloc[-5]) / close.iloc[-5] * 100
            if momentum > 3:
                score += 10
                reasons.append(f"5日騰落率+{momentum:.1f}%")
            elif momentum < -3:
                score -= 10
                reasons.append(f"5日騰落率{momentum:.1f}%")

        score = max(0, min(100, score))

        if score >= 70:
            signal = "buy"
        elif score <= 40:
            signal = "sell"
        else:
            signal = "hold"

        return AnalysisResult(
            ticker=ticker,
            score=round(score, 1),
            signal=signal,
            reasoning="・".join(reasons),
            metadata={
                "sma5": round(sma5.iloc[-1], 2) if pd.notna(sma5.iloc[-1]) else None,
                "sma20": round(sma20.iloc[-1], 2) if pd.notna(sma20.iloc[-1]) else None,
                "rsi": round(current_rsi, 1) if pd.notna(current_rsi) else None,
            },
        )
