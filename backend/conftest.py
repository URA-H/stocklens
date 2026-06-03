import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def price_data_rising() -> pd.DataFrame:
    """250 days of steadily rising stock data."""
    dates = pd.bdate_range(end=pd.Timestamp.now(), periods=250)
    base = 1000
    prices = base + np.linspace(0, 500, 250) + np.random.default_rng(42).normal(0, 10, 250)
    volume = np.random.default_rng(42).integers(500_000, 2_000_000, 250).astype(float)
    return pd.DataFrame(
        {"Open": prices * 0.99, "High": prices * 1.01, "Low": prices * 0.98, "Close": prices, "Volume": volume},
        index=dates,
    )


@pytest.fixture
def price_data_falling() -> pd.DataFrame:
    """250 days of falling stock data."""
    dates = pd.bdate_range(end=pd.Timestamp.now(), periods=250)
    base = 1500
    prices = base - np.linspace(0, 600, 250) + np.random.default_rng(42).normal(0, 10, 250)
    volume = np.random.default_rng(42).integers(500_000, 2_000_000, 250).astype(float)
    return pd.DataFrame(
        {"Open": prices * 0.99, "High": prices * 1.01, "Low": prices * 0.98, "Close": prices, "Volume": volume},
        index=dates,
    )


@pytest.fixture
def market_data() -> pd.DataFrame:
    """250 days of Nikkei-225 like market data."""
    dates = pd.bdate_range(end=pd.Timestamp.now(), periods=250)
    base = 30000
    prices = base + np.linspace(0, 3000, 250) + np.random.default_rng(99).normal(0, 100, 250)
    volume = np.random.default_rng(99).integers(1_000_000, 5_000_000, 250).astype(float)
    return pd.DataFrame(
        {"Open": prices * 0.99, "High": prices * 1.01, "Low": prices * 0.98, "Close": prices, "Volume": volume},
        index=dates,
    )
