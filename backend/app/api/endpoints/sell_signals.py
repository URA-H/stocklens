from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import verify_api_key
from app.services.sell_signal import SellSignalService

router = APIRouter()
sell_signal_service = SellSignalService()


class HoldingInput(BaseModel):
    ticker: str
    purchase_price: float
    purchase_date: str
    company_name: str = ""


class CheckSignalsRequest(BaseModel):
    holdings: list[HoldingInput]


@router.post("/check-sell-signals")
async def check_sell_signals(
    request: CheckSignalsRequest,
    _: None = Depends(verify_api_key),
):
    """Check sell signals for a list of holdings.

    Analyzes each holding against O'Neil's 6 sell rules and returns
    signals sorted by urgency.
    """
    holdings = [h.model_dump() for h in request.holdings]
    results = await sell_signal_service.check_signals(holdings)
    return [r.model_dump() for r in results]
