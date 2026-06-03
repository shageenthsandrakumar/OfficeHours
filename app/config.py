from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    gmi_api_key: str = ""
    gmi_endpoint: str = ""
    phinite_api_key: str = ""
    phinite_project: str = ""

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/research_match"

    # negotiation
    max_turns: int = 6
    default_model: str = "claude-sonnet-4-6"


settings = Settings()
