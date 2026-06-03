from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import verify_api_key
from app.services.stock_data import StockDataService

router = APIRouter()
stock_service = StockDataService()


@router.get("/{ticker}")
async def get_stock(ticker: str, _: None = Depends(verify_api_key)):
    """Get stock data for a specific ticker (e.g., 7203.T for Toyota)."""
    data = await stock_service.get_stock_info(ticker)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return data


@router.get("/{ticker}/history")
async def get_stock_history(
    ticker: str, period: str = "3mo", _: None = Depends(verify_api_key)
):
    """Get historical price data for a stock."""
    history = await stock_service.get_price_history(ticker, period)
    if history is None:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return history
