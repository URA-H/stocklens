from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "StockLens API"
    debug: bool = False
    api_key: str = "dev-api-key"
    database_url: str = "postgresql://stockapp:stockapp_dev@localhost:5432/stockapp"
    cors_origins: list[str] = ["http://localhost:3000"]
    anthropic_api_key: str = ""
    port: int = 8000

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
