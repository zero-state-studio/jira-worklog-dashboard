"""
Authentication Configuration - OAuth and JWT settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class AuthSettings(BaseSettings):
    """Authentication configuration from environment variables."""

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"
    GOOGLE_REDIRECT_URI_TAURI: str = "jira-worklog://auth/callback"

    # JWT Token Settings
    JWT_SECRET_KEY: str  # Generate with: openssl rand -hex 32
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Invitation Settings
    INVITATION_EXPIRE_HOURS: int = 72

    # Development Mode Configuration
    DEV_MODE: bool = False  # Master switch for dev authentication

    # Dev mode defaults (used when DEV_MODE=true)
    DEV_DEFAULT_EMAIL: str = "dev@dev.local"
    DEV_DEFAULT_FIRST_NAME: str = "Dev"
    DEV_DEFAULT_LAST_NAME: str = "User"
    DEV_DEFAULT_COMPANY: str = "Dev Company"

    # Frontend URL (for OAuth redirects)
    FRONTEND_URL: str = "http://localhost:5173"

    # Email Provider Configuration (SMTP or SendGrid)
    EMAIL_PROVIDER: str = "smtp"  # "smtp" or "sendgrid"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@jira-worklog.local"

    class Config:
        env_file = ".env"


# Global auth settings instance
auth_settings = AuthSettings()
