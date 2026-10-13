from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore", hide_input_in_errors=True)

    app_env: Literal["development", "test", "staging", "production"] = "development"
    database_url: SecretStr
    db_pool_size: int = Field(default=5, ge=1, le=50)
    db_pool_timeout: int = Field(default=3, ge=1, le=30)
    db_connect_timeout: int = Field(default=3, ge=1, le=30)
    db_statement_timeout_ms: int = Field(default=3000, ge=100, le=30000)
    auth_secret: SecretStr
    auth_mfa_key: SecretStr
    proxy_shared_secret: SecretStr | None = None
    auth_allowed_origins: list[str] = ["http://127.0.0.1:3000", "http://127.0.0.1:3100"]
    auth_session_seconds: int = Field(default=28800, ge=300, le=86400)
    auth_idle_seconds: int = Field(default=1800, ge=60, le=3600)
    auth_login_ip_limit: int = Field(default=20, ge=1, le=1000)
    auth_login_account_limit: int = Field(default=5, ge=1, le=200)
    auth_challenge_limit: int = Field(default=30, ge=1, le=1000)
    media_root: Path = Path(".media")
    forms_token_limit: int = Field(default=40, ge=1, le=1000)
    forms_submit_limit: int = Field(default=20, ge=1, le=1000)
    forms_contact_limit: int = Field(default=5, ge=1, le=100)
    seo_indexing_enabled: bool = False
    analytics_enabled: bool = False
    analytics_event_limit: int = Field(default=240, ge=1, le=1000)

    @field_validator("auth_secret", "auth_mfa_key")
    @classmethod
    def require_key(cls, value: SecretStr) -> SecretStr:
        try:
            valid = (
                len(value.get_secret_value()) == 64
                and len(bytes.fromhex(value.get_secret_value())) == 32
            )
        except ValueError:
            valid = False
        if not valid:
            raise ValueError("An independent 32-byte hexadecimal key is required")
        return value

    @model_validator(mode="after")
    def secure_auth_configuration(self):
        if self.auth_secret.get_secret_value() == self.auth_mfa_key.get_secret_value():
            raise ValueError("Authentication and MFA encryption keys must differ")
        if self.proxy_shared_secret is not None:
            self.require_key(self.proxy_shared_secret)
            if self.proxy_shared_secret.get_secret_value() in (
                self.auth_secret.get_secret_value(),
                self.auth_mfa_key.get_secret_value(),
            ):
                raise ValueError("Proxy authentication needs an independent key")
        elif self.app_env in ("staging", "production"):
            raise ValueError("An independent proxy authentication key is required")
        if not self.auth_allowed_origins:
            raise ValueError("At least one exact origin is required")
        for origin in self.auth_allowed_origins:
            url = urlsplit(origin)
            if (
                not url.hostname
                or url.username
                or url.password
                or url.path
                or url.query
                or url.fragment
            ):
                raise ValueError("Origins must contain only scheme and authority")
            if url.scheme != "https" and not (
                self.app_env in ("development", "test")
                and url.scheme == "http"
                and url.hostname in ("127.0.0.1", "localhost", "testserver")
            ):
                raise ValueError("HTTPS origins are required outside local development")
        return self

    @property
    def secure_cookies(self) -> bool:
        return self.app_env in ("production", "staging")

    @property
    def session_cookie(self) -> str:
        return "__Host-makan_session" if self.secure_cookies else "makan_session"

    @property
    def challenge_cookie(self) -> str:
        return "__Host-makan_challenge" if self.secure_cookies else "makan_challenge"

    @field_validator("database_url")
    @classmethod
    def require_postgres(cls, value: SecretStr) -> SecretStr:
        try:
            url = make_url(value.get_secret_value())
            valid = (
                url.drivername == "postgresql+psycopg"
                and url.host
                and url.database
                and url.username
                and url.password
            )
        except Exception:
            valid = False
        if not valid:
            raise ValueError("A complete PostgreSQL psycopg connection is required")
        return value
