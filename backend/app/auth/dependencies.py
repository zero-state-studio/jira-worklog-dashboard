"""
Authentication Dependencies - FastAPI dependency injection for auth.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .jwt import verify_token
from ..cache import get_storage
from ..models import UserRole


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
        last_name: str = None,
        role_level: int = None
    ):
        self.id = id
        self.company_id = company_id
        self.email = email
        self.role = role
        self.google_id = google_id
        self.first_name = first_name
        self.last_name = last_name
        self.role_level = role_level if role_level is not None else UserRole.get_level(role)

    def is_admin(self) -> bool:
        """Check if user has ADMIN role."""
        return self.role == UserRole.ADMIN

    def is_manager(self) -> bool:
        """Check if user has MANAGER role or higher."""
        return self.role_level >= UserRole.LEVELS[UserRole.MANAGER]

    def has_role_level(self, min_level: int) -> bool:
        """Check if user has at least the specified role level."""
        return self.role_level >= min_level

    def can_manage_teams(self) -> bool:
        """Check if user can manage teams (PM or higher, level >= 2)."""
        return self.role_level >= UserRole.LEVELS[UserRole.PM]

    def can_manage_users(self) -> bool:
        """Check if user can manage users (MANAGER or higher, level >= 3)."""
        return self.role_level >= UserRole.LEVELS[UserRole.MANAGER]

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

    # Extract role_level from JWT payload (backward compatible: derive from role if missing)
    role_level = payload.get("role_level")

    return CurrentUser(
        id=user["id"],
        company_id=user["company_id"],
        email=user["email"],
        role=user["role"],
        google_id=user["google_id"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        role_level=role_level
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


def require_pm(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    FastAPI dependency that requires PM role or higher (level >= 2).

    Args:
        current_user: Current authenticated user

    Returns:
        CurrentUser instance

    Raises:
        HTTPException: 403 if user level is below PM
    """
    if not current_user.can_manage_teams():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PM privileges required"
        )
    return current_user


def require_role_level(min_level: int):
    """
    Factory function that creates a FastAPI dependency requiring a minimum role level.

    Args:
        min_level: Minimum role level required (1=DEV, 2=PM, 3=MANAGER, 4=ADMIN)

    Returns:
        FastAPI dependency function

    Usage:
        @router.get("/resource")
        async def get_resource(current_user: CurrentUser = Depends(require_role_level(3))):
            ...
    """
    def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.has_role_level(min_level):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role level. Required: {min_level}, current: {current_user.role_level}"
            )
        return current_user
    return dependency
