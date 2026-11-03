from functools import lru_cache
from typing import Literal

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BLUESTEPS_", env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: SecretStr = SecretStr("")
    jwt_private_key: SecretStr = SecretStr("")
    jwt_public_key: str = ""
    jwt_key_id: str = ""
    otp_pepper: SecretStr = SecretStr("")
    cors_origins: list[str] = []
    access_ttl_seconds: int = Field(default=900, ge=60, le=900)
    refresh_ttl_seconds: int = Field(default=2592000, ge=3600, le=2592000)
    pool_size: int = Field(default=5, ge=1, le=20)
    # Delivery adapters are deliberately unconfigured: no pretend email/AI success.
    registration_enabled: bool = False
    terms_version: str = "2026-10-31"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    mail_from: str = ""
    local_mail_directory: str = ""
    scan_model_directory: str = ""
    scan_confidence_threshold: float = Field(default=0.6, ge=0, le=1)
    # Local development has a keyless default; production sets an explicit provider URL.
    routing_url: str = ""
    routing_client_id: str = Field(default="bluesteps-local-development", min_length=3, max_length=200)
    routing_timeout_s: float = Field(default=12, ge=1, le=30)

    def resolved_routing_url(self) -> str:
        return self.routing_url or ("https://valhalla1.openstreetmap.de" if self.environment == "development" else "")

    def validate_runtime(self) -> None:
        if not self.database_url.get_secret_value():
            raise ValueError("BLUESTEPS_DATABASE_URL is required")
        if not self.database_url.get_secret_value().startswith("postgresql+psycopg://"):
            raise ValueError("Use a PostgreSQL psycopg SQLAlchemy URL")
        if not self.jwt_private_key.get_secret_value() or not self.jwt_public_key or not self.jwt_key_id:
            raise ValueError("RSA signing key, public key and key ID are required; no fallback key")
        private = serialization.load_pem_private_key(self.jwt_private_key.get_secret_value().encode(), password=None)
        public = serialization.load_pem_public_key(self.jwt_public_key.encode())
        if not isinstance(private, rsa.RSAPrivateKey) or not isinstance(public, rsa.RSAPublicKey):
            raise ValueError("RS256 requires RSA keys")
        if private.key_size < 2048 or private.public_key().public_numbers() != public.public_numbers():
            raise ValueError("RSA keys must match and contain at least 2048 bits")
        if len(self.otp_pepper.get_secret_value()) < 32:
            raise ValueError("BLUESTEPS_OTP_PEPPER must contain at least 32 characters")
        if self.environment == "production":
            if self.local_mail_directory:
                raise ValueError("Local mail sink is forbidden in production")
            if "sslmode=verify-full" not in self.database_url.get_secret_value():
                raise ValueError("Production database connections require sslmode=verify-full")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS")
        if self.registration_enabled and not (self.smtp_host or self.local_mail_directory):
            raise ValueError("Registration requires an explicit email delivery adapter")
        if self.registration_enabled and self.smtp_host and not self.mail_from:
            raise ValueError("SMTP registration requires BLUESTEPS_MAIL_FROM")


@lru_cache
def get_settings() -> Settings:
    return Settings()
