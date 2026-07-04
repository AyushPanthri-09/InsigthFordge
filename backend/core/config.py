import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    """
    Application Settings Loader.
    Loads configurations from environment variables or .env file.
    """
    host: str = Field(default="127.0.0.1", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")
    debug: bool = Field(default=True, validation_alias="DEBUG")
    database_url: str = Field(default="sqlite:///./insightforge.db", validation_alias="DATABASE_URL")
    max_upload_size: int = Field(default=10485760, validation_alias="MAX_UPLOAD_SIZE")
    secret_key: str = Field(
        default="insightforge_super_secure_secret_key_must_be_changed_in_prod",
        validation_alias="SECRET_KEY",
    )

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
        return value

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
