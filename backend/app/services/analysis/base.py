from abc import ABC, abstractmethod

import pandas as pd
from pydantic import BaseModel


class AnalysisResult(BaseModel):
    """Result from a single analysis strategy."""

    ticker: str
    score: float  # 0-100
    signal: str  # "buy" | "hold" | "sell"
    reasoning: str
    metadata: dict = {}


class AnalysisStrategy(ABC):
    """Base class for analysis strategies. Subclass to add new analysis methods."""

    name: str = "base"
    weight: float = 1.0

    @abstractmethod
    async def analyze(self, ticker: str, data: pd.DataFrame) -> AnalysisResult:
        """Analyze a stock and return a result."""
        ...
