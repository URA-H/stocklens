"""API endpoint integration tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def api_key():
    return settings.api_key


class TestHealth:
    def test_health_check(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"

    def test_health_via_api_prefix(self, client, api_key):
        res = client.get("/api/v1/health", headers={"X-Api-Key": api_key})
        assert res.status_code == 200


class TestAPIKeyAuth:
    def test_missing_key_returns_422(self, client):
        """Missing X-Api-Key header → 422 (FastAPI validation)."""
        res = client.get("/api/v1/recommendations/")
        assert res.status_code == 422

    def test_wrong_key_returns_401(self, client):
        res = client.get(
            "/api/v1/recommendations/",
            headers={"X-Api-Key": "wrong-key"},
        )
        assert res.status_code == 401

    def test_correct_key_accepted(self, client, api_key):
        # This will succeed auth but may timeout on yfinance calls
        # We just verify it gets past auth (not 401/422)
        res = client.get(
            "/api/v1/stocks/7203.T",
            headers={"X-Api-Key": api_key},
        )
        assert res.status_code != 401
        assert res.status_code != 422


class TestSellSignalsEndpoint:
    def test_empty_holdings(self, client, api_key):
        res = client.post(
            "/api/v1/portfolio/check-sell-signals",
            headers={"X-Api-Key": api_key},
            json={"holdings": []},
        )
        assert res.status_code == 200
        assert res.json() == []

    def test_invalid_body(self, client, api_key):
        res = client.post(
            "/api/v1/portfolio/check-sell-signals",
            headers={"X-Api-Key": api_key},
            json={},
        )
        assert res.status_code == 422
