"""
Cup With Handle Pattern Detection — O'Neil's signature chart pattern.

Detects the "cup with handle" formation:
1. Cup: A U-shaped base (7-65 weeks typically, we use ~30-150 trading days)
   - Left side: prior uptrend then decline (12-35% correction typical)
   - Bottom: rounded, not V-shaped
   - Right side: recovery back toward the prior high
2. Handle: A slight pullback (drift down) near the cup's high
   - Typically 1-4 weeks
   - Should not drop more than 12% from the cup's high
   - Volume should dry up in the handle
3. Pivot/Breakout point: Top of the handle + small margin

Also detects related base patterns:
- Double bottom
- Flat base (tight consolidation)
"""

import numpy as np
import pandas as pd

from app.services.analysis.base import AnalysisResult, AnalysisStrategy


class CupWithHandleStrategy(AnalysisStrategy):
    """Detect cup-with-handle and related base patterns."""

    name = "cup_with_handle"
    weight = 1.5

    # Pattern parameters
    MIN_CUP_DAYS = 25          # Minimum cup length (trading days)
    MAX_CUP_DAYS = 150         # Maximum cup length
    MIN_CUP_DEPTH_PCT = 12     # Minimum correction depth %
    MAX_CUP_DEPTH_PCT = 35     # Maximum correction depth %
    MAX_HANDLE_DROP_PCT = 12   # Handle should not drop more than this %
    HANDLE_MIN_DAYS = 5        # Minimum handle length
    HANDLE_MAX_DAYS = 25       # Maximum handle length

    async def analyze(self, ticker: str, data: pd.DataFrame) -> AnalysisResult:
        if data is None or len(data) < self.MIN_CUP_DAYS + 20:
            return AnalysisResult(
                ticker=ticker,
                score=50,
                signal="hold",
                reasoning="チャートデータ不足",
            )

        close = data["Close"].values
        volume = data["Volume"].values if "Volume" in data.columns else None

        # Try to detect patterns
        cup_result = self._detect_cup_with_handle(close, volume)
        flat_base = self._detect_flat_base(close)
        double_bottom = self._detect_double_bottom(close)

        score = 50.0
        reasons = []
        metadata = {}

        if cup_result["detected"]:
            score += cup_result["score_bonus"]
            reasons.append(f"カップウィズハンドル検出（深さ{cup_result['depth']:.0f}%）")
            metadata["cup_with_handle"] = cup_result

            if cup_result.get("near_pivot"):
                score += 10
                reasons.append("ピボットポイント付近")

            if cup_result.get("volume_dry_up"):
                score += 5
                reasons.append("ハンドル出来高減少（好サイン）")

        if double_bottom["detected"]:
            score += double_bottom["score_bonus"]
            reasons.append("ダブルボトム形成")
            metadata["double_bottom"] = double_bottom

        if flat_base["detected"]:
            score += flat_base["score_bonus"]
            reasons.append(f"フラットベース（{flat_base['range_pct']:.1f}%レンジ）")
            metadata["flat_base"] = flat_base

        # Proximity to 52-week high (O'Neil prefers stocks near highs)
        high_52w = np.max(close[-252:]) if len(close) >= 252 else np.max(close)
        pct_from_high = (close[-1] - high_52w) / high_52w * 100
        if pct_from_high >= -5:
            score += 5
            reasons.append(f"52週高値から{pct_from_high:+.1f}%")
        elif pct_from_high <= -25:
            score -= 10
            reasons.append(f"52週高値から{pct_from_high:.0f}%乖離")

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
            reasoning="・".join(reasons) if reasons else "ベースパターン形成なし",
            metadata=metadata,
        )

    def _detect_cup_with_handle(
        self, close: np.ndarray, volume: np.ndarray | None
    ) -> dict:
        """Detect cup-with-handle pattern in recent price data."""
        n = len(close)
        if n < self.MIN_CUP_DAYS + self.HANDLE_MIN_DAYS:
            return {"detected": False}

        # Search for cup pattern in the most recent data
        # Look back from the end to find a potential handle, then the cup before it
        best = {"detected": False, "score_bonus": 0}

        for cup_end in range(n - self.HANDLE_MIN_DAYS, n - self.HANDLE_MAX_DAYS - 1, -1):
            for cup_len in range(self.MIN_CUP_DAYS, min(self.MAX_CUP_DAYS, cup_end) + 1, 5):
                cup_start = cup_end - cup_len
                if cup_start < 0:
                    continue

                cup_data = close[cup_start : cup_end + 1]
                left_high = cup_data[0]
                right_high = cup_data[-1]
                cup_low = np.min(cup_data)
                cup_low_idx = np.argmin(cup_data)

                # Cup depth check
                depth_pct = (left_high - cup_low) / left_high * 100
                if depth_pct < self.MIN_CUP_DEPTH_PCT or depth_pct > self.MAX_CUP_DEPTH_PCT:
                    continue

                # Right side should recover to near left high (within 10%)
                if right_high < left_high * 0.90:
                    continue

                # Cup bottom should be roughly in the middle (U-shape, not V)
                relative_low_pos = cup_low_idx / len(cup_data)
                if relative_low_pos < 0.25 or relative_low_pos > 0.75:
                    continue

                # Check for handle after the cup
                handle_data = close[cup_end:]
                if len(handle_data) < self.HANDLE_MIN_DAYS:
                    continue

                handle_high = right_high
                handle_low = np.min(handle_data)
                handle_drop = (handle_high - handle_low) / handle_high * 100

                if handle_drop > self.MAX_HANDLE_DROP_PCT:
                    continue

                # Handle should drift downward slightly, not collapse
                # Calculate pivot point
                pivot = handle_high * 1.001  # Just above the handle high

                # Volume dry-up in handle
                volume_dry_up = False
                if volume is not None:
                    cup_avg_vol = np.mean(volume[cup_start:cup_end])
                    handle_avg_vol = np.mean(volume[cup_end:])
                    volume_dry_up = handle_avg_vol < cup_avg_vol * 0.7

                # Near pivot?
                near_pivot = close[-1] >= pivot * 0.97

                # Score the pattern quality
                score_bonus = 20
                if depth_pct >= 15 and depth_pct <= 30:
                    score_bonus += 5  # Ideal depth
                if volume_dry_up:
                    score_bonus += 5
                if near_pivot:
                    score_bonus += 5

                if score_bonus > best.get("score_bonus", 0):
                    best = {
                        "detected": True,
                        "score_bonus": score_bonus,
                        "depth": depth_pct,
                        "cup_length_days": cup_len,
                        "handle_drop": handle_drop,
                        "pivot_price": round(pivot, 2),
                        "near_pivot": near_pivot,
                        "volume_dry_up": volume_dry_up,
                    }

            if best["detected"]:
                break  # Use the first good match from the end

        return best

    def _detect_flat_base(self, close: np.ndarray) -> dict:
        """Detect flat base pattern (tight consolidation, <15% range over 5+ weeks)."""
        if len(close) < 25:
            return {"detected": False}

        # Check last 25-50 trading days for tight range
        for window in [50, 35, 25]:
            if len(close) < window:
                continue
            recent = close[-window:]
            high = np.max(recent)
            low = np.min(recent)
            range_pct = (high - low) / high * 100

            if range_pct <= 15:
                return {
                    "detected": True,
                    "score_bonus": 10,
                    "range_pct": round(range_pct, 1),
                    "window_days": window,
                }

        return {"detected": False}

    def _detect_double_bottom(self, close: np.ndarray) -> dict:
        """Detect double bottom (W-shape) pattern."""
        if len(close) < 40:
            return {"detected": False}

        recent = close[-80:] if len(close) >= 80 else close
        n = len(recent)

        # Find two significant lows
        mid = n // 2
        first_half = recent[: mid + 5]
        second_half = recent[mid - 5 :]

        first_low_idx = np.argmin(first_half)
        second_low_idx = np.argmin(second_half) + (mid - 5)

        first_low = recent[first_low_idx]
        second_low = recent[second_low_idx]

        # The two lows should be within 3% of each other
        low_diff_pct = abs(first_low - second_low) / first_low * 100
        if low_diff_pct > 5:
            return {"detected": False}

        # There should be a peak between the two lows
        if second_low_idx <= first_low_idx + 10:
            return {"detected": False}

        between = recent[first_low_idx:second_low_idx]
        peak = np.max(between)
        peak_height = (peak - first_low) / first_low * 100

        if peak_height < 5:
            return {"detected": False}

        # Current price should be recovering from the second low
        if recent[-1] > second_low * 1.03:
            # O'Neil: second bottom should undercut the first slightly
            undercut = second_low < first_low
            score_bonus = 15 if undercut else 10

            return {
                "detected": True,
                "score_bonus": score_bonus,
                "first_low": round(float(first_low), 2),
                "second_low": round(float(second_low), 2),
                "undercut": undercut,
            }

        return {"detected": False}
