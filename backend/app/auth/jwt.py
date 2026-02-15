"""
JWT Token Management - Access and refresh token generation/verification.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
import secrets

from ..auth_config import auth_settings


def create_access_token(user_id: int, company_id: int, email: str, role: str, role_level: int = None) -> str:
    """
    Create a JWT access token with user claims.

    Args:
        user_id: OAuth user ID
        company_id: Company/organization ID
        email: User email
        role: User role (DEV, PM, MANAGER, ADMIN)
        role_level: Numeric role level (1-4). If None, derived from role via UserRole.

    Returns:
        Encoded JWT token string
    """
    if role_level is None:
        from ..models import UserRole
        role_level = UserRole.get_level(role)

    expire = datetime.utcnow() + timedelta(minutes=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = secrets.token_urlsafe(16)  # JWT ID for token tracking

    payload = {
        "sub": str(user_id),  # Subject (user ID)
        "email": email,
        "company_id": company_id,
        "role": role,
        "role_level": role_level,
        "jti": jti,  # JWT ID
        "exp": expire,  # Expiration time
        "type": "access"  # Token type
    }

    return jwt.encode(payload, auth_settings.JWT_SECRET_KEY, algorithm=auth_settings.JWT_ALGORITHM)


def create_refresh_token() -> str:
    """
    Create a cryptographically secure refresh token.

    Returns:
        URL-safe random token string
    """
    return secrets.token_urlsafe(32)


def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded payload dict if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(
            token,
            auth_settings.JWT_SECRET_KEY,
            algorithms=[auth_settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def create_onboarding_token(
    google_id: str,
    email: str,
    first_name: str = None,
    last_name: str = None,
    picture_url: str = None
) -> str:
    """
    Create a short-lived JWT token for the onboarding flow.

    This token is issued when a new user (first signup, no company yet)
    completes Google OAuth but hasn't created their company yet.

    Args:
        google_id: Google OAuth ID
        email: User email from Google
        first_name: First name from Google profile
        last_name: Last name from Google profile
        picture_url: Profile picture URL from Google

    Returns:
        Encoded JWT token string (10 min expiry)
    """
    expire = datetime.utcnow() + timedelta(minutes=10)

    payload = {
        "type": "onboarding",
        "google_id": google_id,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "picture_url": picture_url,
        "exp": expire,
    }

    return jwt.encode(payload, auth_settings.JWT_SECRET_KEY, algorithm=auth_settings.JWT_ALGORITHM)


def decode_token_without_verification(token: str) -> Optional[dict]:
    """
    Decode a JWT token without verifying signature (for debugging/logging).

    Args:
        token: JWT token string

    Returns:
        Decoded payload dict if parseable, None otherwise
    """
    try:
        return jwt.get_unverified_claims(token)
    except Exception:
        return None
