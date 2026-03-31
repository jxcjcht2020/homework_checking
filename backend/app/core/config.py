from functools import cached_property
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Homework Checking Platform API"
    app_env: str = "development"
    app_debug: bool = True
    api_prefix: str = "/api"

    jwt_secret: str = "change-this-secret-before-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720

    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5432
    postgres_db: str = "homework_platform"
    postgres_user: str = "homework_admin"
    postgres_password: str = "change-this-password"
    database_url: str | None = None

    postgres_install_dir: Path = Field(default=Path(r"E:\PostgreSQL"))
    postgres_data_dir: Path = Field(default=BASE_DIR / "storage" / "postgres-data")
    storage_root: Path = Field(default=BASE_DIR / "storage")

    grading_mode: str = "mock"
    homework_skill_root: Path = Field(
        default=Path(r"D:\Desktop\evolution\0 program\homework-checking\skills\homework-checking")
    )
    model_provider: str | None = None
    model_name: str | None = None
    model_api_key: str | None = None
    model_base_url: str | None = None
    cors_origins: list[str] = Field(default=["http://localhost:5173", "http://127.0.0.1:5173"])

    @cached_property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @cached_property
    def standards_dir(self) -> Path:
        return self.storage_root / "standards"

    @cached_property
    def submissions_dir(self) -> Path:
        return self.storage_root / "submissions"

    @cached_property
    def reviews_dir(self) -> Path:
        return self.storage_root / "reviews"


settings = Settings()
