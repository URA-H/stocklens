from fastapi import APIRouter

from app.api.endpoints import stocks, recommendations, health, ai_review, sell_signals

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(
    recommendations.router, prefix="/recommendations", tags=["recommendations"]
)
api_router.include_router(
    ai_review.router, prefix="/stocks", tags=["ai-review"]
)
api_router.include_router(
    sell_signals.router, prefix="/portfolio", tags=["portfolio"]
)
