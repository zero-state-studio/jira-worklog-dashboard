"""
Authentication Dependencies - FastAPI dependency injection for auth.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .jwt import verify_token
from ..cache import get_storage


# HTTP Bearer token security scheme
security = HTTPBearer()


class CurrentUser:
    """
    Represents the currently authenticated user with their company context.
    """

    def __init__(
        self,
        id: int,
        company_id: int,
        email: str,
        role: str,
        google_id: str,
        first_name: str = None,
        last_name: str = None
    ):
        self.id = id
        self.company_id = company_id
        self.email = email
        self.role = role
        self.google_id = google_id
        self.first_name = first_name
        self.last_name = last_name

    def is_admin(self) -> bool:
        """Check if user has ADMIN role."""
        return self.role == "ADMIN"

    def is_manager(self) -> bool:
        """Check if user has MANAGER role or higher."""
        return self.role in ["ADMIN", "MANAGER"]

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    FastAPI dependency to get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Authorization credentials with Bearer token

    Returns:
        CurrentUser instance

    Raises:
        HTTPException: 401 if token invalid or user not found/inactive
    """
    token = credentials.credentials
    payload = verify_token(token)

    # Verify token is valid and is an access token
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Get user from database
    storage = get_storage()
    user_id = int(payload["sub"])
    user = await storage.get_oauth_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return CurrentUser(
        id=user["id"],
        company_id=user["company_id"],
        email=user["email"],
        role=user["role"],
        google_id=user["google_id"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name")
    )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
) -> Optional[CurrentUser]:
    """
    Optional authentication - returns None if no token provided.
    Used for endpoints that work both authenticated and unauthenticated.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    FastAPI dependency that requires ADMIN role.

    Args:
        current_user: Current authenticated user

    Returns:
        CurrentUser instance

    Raises:
        HTTPException: 403 if user is not ADMIN
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def require_manager(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    FastAPI dependency that requires MANAGER role or higher.

    Args:
        current_user: Current authenticated user

    Returns:
        CurrentUser instance

    Raises:
        HTTPException: 403 if user is not MANAGER or ADMIN
    """
    if not current_user.is_manager():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager privileges required"
        )
    return current_user
