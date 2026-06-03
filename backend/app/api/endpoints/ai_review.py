from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import verify_api_key
from app.services.ai_review import AIReviewService
from app.services.stock_data import StockDataService

router = APIRouter()
ai_service = AIReviewService()
stock_service = StockDataService()


@router.get("/{ticker}/ai-review")
async def get_ai_review(
    ticker: str,
    _: None = Depends(verify_api_key),
):
    """Get AI-generated qualitative review for a stock.

    Gathers latest news, industry trends, company IR, and SNS sentiment,
    then generates a structured analysis using Claude.
    Results are cached for 6 hours.
    """
    # Get company name from stock info
    info = await stock_service.get_stock_info(ticker)
    if info is None:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    company_name = info.get("name", ticker)

    try:
        review = await ai_service.generate_review(ticker, company_name)
        return review.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
