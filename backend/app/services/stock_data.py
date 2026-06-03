import asyncio
import logging

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


class StockDataService:
    """Stock data fetching service using yfinance.

    All public methods are async and run blocking yfinance I/O
    in a thread pool via asyncio.to_thread.
    """

    async def get_stock_info(self, ticker: str) -> dict | None:
        """Get basic stock information."""
        return await asyncio.to_thread(self._get_stock_info_sync, ticker)

    async def get_price_history(
        self, ticker: str, period: str = "3mo"
    ) -> pd.DataFrame | None:
        """Get historical price data."""
        return await asyncio.to_thread(self._get_price_history_sync, ticker, period)

    async def get_market_data(
        self, ticker: str = "^N225", period: str = "1y"
    ) -> pd.DataFrame | None:
        """Get market index data (cached per request cycle)."""
        return await asyncio.to_thread(self._get_price_history_sync, ticker, period)

    # ── Sync internals (run in thread pool) ────────────────────────────

    def _get_stock_info_sync(self, ticker: str) -> dict | None:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            if not info or "symbol" not in info:
                return None
            return {
                "ticker": ticker,
                "name": info.get("longName") or info.get("shortName", ticker),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "market_cap": info.get("marketCap"),
                "current_price": info.get("currentPrice")
                or info.get("regularMarketPrice"),
                "per": info.get("trailingPE"),
                "pbr": info.get("priceToBook"),
                "dividend_yield": info.get("dividendYield"),
                "roe": info.get("returnOnEquity"),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
                "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            }
        except Exception:
            logger.exception("Failed to fetch stock info for %s", ticker)
            return None

    def _get_price_history_sync(
        self, ticker: str, period: str = "3mo"
    ) -> pd.DataFrame | None:
        try:
            stock = yf.Ticker(ticker)
            df = stock.history(period=period)
            if df.empty:
                return None
            return df
        except Exception:
            logger.exception("Failed to fetch price history for %s", ticker)
            return None
