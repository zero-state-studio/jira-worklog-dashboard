"""
Authentication Router - Google OAuth login, logout, token refresh.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import RedirectResponse
from typing import Optional
import json
from urllib.parse import urlencode

from ..models import (
    TokenResponse, RefreshTokenRequest, OAuthUserResponse, CompanyResponse,
    OnboardingRequiredResponse, CompleteOnboardingRequest,
    UpdateProfileRequest, UpdateCompanyRequest, DevLoginRequest
)
from ..auth.jwt import create_access_token, create_refresh_token, create_onboarding_token, verify_token
from ..auth.dependencies import get_current_user, get_current_user_optional, require_admin, CurrentUser
from ..auth.google_oauth import oauth
from ..auth_config import auth_settings
from ..cache import get_storage
from ..logging_config import get_logger


router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = get_logger(__name__)


@router.get("/login")
async def login(request: Request, platform: str = "web"):
    """
    Initiate OAuth login flow.

    Args:
        platform: "web" or "tauri" (determines redirect URI)
    """
    redirect_uri = (
        auth_settings.GOOGLE_REDIRECT_URI_TAURI
        if platform == "tauri"
        else auth_settings.GOOGLE_REDIRECT_URI
    )

    logger.info(f"Starting OAuth login for platform: {platform}")

    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def oauth_callback(request: Request):
    """
    Handle OAuth callback from Google.

    Creates or logs in user, generates JWT tokens.
    """
    storage = get_storage()

    try:
        # Exchange authorization code for access token
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user info from Google"
            )

        google_id = user_info.get('sub')
        email = user_info.get('email')

        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user info from Google"
            )

        logger.info(f"OAuth callback for email: {email}")

        # Check if user exists
        existing_user = await storage.get_oauth_user_by_google_id(google_id)

        if existing_user:
            # Login existing user
            logger.info(f"Existing user login: {email}")
            await storage.update_oauth_user_last_login(existing_user["id"])
            await storage.log_auth_event(
                event_type="login",
                company_id=existing_user["company_id"],
                user_id=existing_user["id"],
                email=email,
                metadata={"method": "google_oauth"}
            )

            user_id = existing_user["id"]
            company_id = existing_user["company_id"]
            role = existing_user["role"]

        else:
            # Check for pending invitation
            invitation = await storage.get_invitation_by_email(email)

            if invitation and invitation["status"] == "PENDING":
                # Check if invitation expired
                if invitation["expires_at"] < datetime.utcnow():
                    logger.warning(f"Expired invitation for {email}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Invitation has expired"
                    )

                # Create user from invitation
                logger.info(f"Creating user from invitation: {email}")
                user_id = await storage.create_oauth_user(
                    google_id=google_id,
                    email=email,
                    company_id=invitation["company_id"],
                    role=invitation["role"],
                    first_name=user_info.get('given_name'),
                    last_name=user_info.get('family_name'),
                    picture_url=user_info.get('picture')
                )

                await storage.update_invitation_status(invitation["id"], "ACCEPTED")
                await storage.log_auth_event(
                    event_type="signup_via_invitation",
                    company_id=invitation["company_id"],
                    user_id=user_id,
                    email=email
                )

                company_id = invitation["company_id"]
                role = invitation["role"]

            else:
                # Check if this is the first user (no companies exist)
                company_count = await storage.count_companies()

                if company_count == 0:
                    # First user - redirect to onboarding
                    logger.info(f"First user signup: {email} - redirecting to onboarding")

                    domain = email.split('@')[1]
                    onboarding_token = create_onboarding_token(
                        google_id=google_id,
                        email=email,
                        first_name=user_info.get('given_name'),
                        last_name=user_info.get('family_name'),
                        picture_url=user_info.get('picture')
                    )

                    frontend_url = auth_settings.FRONTEND_URL
                    params = urlencode({
                        "onboarding_token": onboarding_token,
                        "email": email,
                        "suggested_name": f"{domain} Organization"
                    })

                    redirect_url = f"{frontend_url}/onboarding?{params}"
                    logger.info(f"Redirecting to: {redirect_url}")
                    return RedirectResponse(url=redirect_url)

                else:
                    # Not first user and no invitation - reject
                    logger.warning(f"Unauthorized signup attempt: {email}")
                    await storage.log_auth_event(
                        event_type="unauthorized_signup_attempt",
                        email=email
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Invitation required to join"
                    )

        # Generate tokens
        access_token = create_access_token(user_id, company_id, email, role)
        refresh_token_str = create_refresh_token()

        # Save session
        expires_at = datetime.utcnow() + timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await storage.create_session(user_id, refresh_token_str, expires_at)

        # Get full user and company data
        user = await storage.get_oauth_user_by_id(user_id)
        company = await storage.get_company(company_id)

        logger.info(f"Authentication successful for {email}")

        # Redirect to frontend with tokens in query params
        frontend_url = auth_settings.FRONTEND_URL
        params = urlencode({
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "user": json.dumps(OAuthUserResponse(**user).dict()),
            "company": json.dumps(CompanyResponse(**company).dict())
        })

        redirect_url = f"{frontend_url}/login?{params}"
        logger.info(f"Redirecting authenticated user to: {redirect_url}")
        return RedirectResponse(url=redirect_url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.post("/logout")
async def logout(
    refresh_token: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user_optional)
):
    """
    Logout user by invalidating their refresh token.

    Args:
        refresh_token: Refresh token to invalidate
        current_user: Current authenticated user (optional)
    """
    storage = get_storage()

    if refresh_token:
        await storage.invalidate_session(refresh_token)

    if current_user:
        logger.info(f"User logged out: {current_user.email}")
        await storage.log_auth_event(
            event_type="logout",
            company_id=current_user.company_id,
            user_id=current_user.id,
            email=current_user.email
        )

    return {"status": "ok", "message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.

    Args:
        request: Refresh token request

    Returns:
        New access token
    """
    storage = get_storage()

    # Get session
    session = await storage.get_session_by_refresh_token(request.refresh_token)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Check if expired
    if session["expires_at"] < datetime.utcnow():
        await storage.invalidate_session(request.refresh_token)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )

    # Get user
    user = await storage.get_oauth_user_by_id(session["user_id"])

    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Generate new access token
    access_token = create_access_token(
        user["id"],
        user["company_id"],
        user["email"],
        user["role"]
    )

    logger.info(f"Token refreshed for user: {user['email']}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Returns:
        User and company information
    """
    storage = get_storage()

    user = await storage.get_oauth_user_by_id(current_user.id)
    company = await storage.get_company(current_user.company_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    return {
        "user": OAuthUserResponse(**user),
        "company": CompanyResponse(**company)
    }


@router.post("/dev/login")
async def dev_login(request: DevLoginRequest):
    """
    Development-only login endpoint that bypasses Google OAuth.

    Creates a fake user and returns real JWT tokens that work with
    the rest of the application.

    Returns 403 Forbidden if DEV_MODE is not enabled (production safety).

    If this is the first user (no companies exist), returns OnboardingRequiredResponse
    to mirror the OAuth flow and allow testing the onboarding process.

    Args:
        request: DevLoginRequest with email, first_name, last_name, role

    Returns:
        TokenResponse with access_token, refresh_token, user, company
        OR OnboardingRequiredResponse if first user
    """
    storage = get_storage()

    email = request.email
    first_name = request.first_name
    last_name = request.last_name
    role = request.role

    # 1. Production safety guard
    if not auth_settings.DEV_MODE:
        logger.warning(f"Dev login attempt with DEV_MODE=false from email: {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development authentication is disabled. Set DEV_MODE=true in .env for local development."
        )

    logger.info(f"Dev login attempt for email: {email}, role: {role}")

    # 3. Check if this is first user (no companies exist) - require onboarding
    company_count = await storage.count_companies()

    if company_count == 0:
        logger.info("No companies found - first dev user requires onboarding")

        # Generate onboarding token (like OAuth flow)
        domain = email.split('@')[1] if '@' in email else 'dev.local'
        onboarding_token = create_onboarding_token(
            google_id=f"dev_{email}",
            email=email,
            first_name=first_name,
            last_name=last_name,
            picture_url=None
        )

        # Return onboarding response
        return OnboardingRequiredResponse(
            onboarding_required=True,
            onboarding_token=onboarding_token,
            email=email,
            first_name=first_name,
            last_name=last_name,
            picture_url=None
        )

    # 4. Check if user already exists (by google_id, globally unique)
    google_id = f"dev_{email}"
    user = await storage.get_oauth_user_by_google_id(google_id)

    if user:
        # User exists - use their existing company_id
        company_id = user["company_id"]
        logger.info(f"Existing dev user login: {email}, company_id={company_id}")
        user_id = user["id"]
        await storage.update_oauth_user_last_login(user_id)
    else:
        # User doesn't exist - create NEW company for this dev user
        domain = email.split('@')[1] if '@' in email else 'dev.local'
        company_name = f"Dev Company - {email}"

        logger.info(f"Creating new dev company for user: {email}")
        company_id = await storage.create_company(
            name=company_name,
            domain=domain
        )

        # Create new dev user in the new company
        logger.info(f"Creating new dev user: {email} in company_id={company_id}")
        user_id = await storage.create_oauth_user(
            google_id=google_id,
            email=email,
            company_id=company_id,
            role=role,
            first_name=first_name,
            last_name=last_name,
            picture_url=None
        )

    # 5. Generate real JWT tokens (same as OAuth flow)
    access_token = create_access_token(user_id, company_id, email, role)
    refresh_token_str = create_refresh_token()

    expires_at = datetime.utcnow() + timedelta(
        days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    # 6. Create session
    await storage.create_session(user_id, refresh_token_str, expires_at)

    # 7. Log auth event
    await storage.log_auth_event(
        event_type="dev_login",
        company_id=company_id,
        user_id=user_id,
        email=email,
        metadata={"role": role, "method": "dev_bypass"}
    )

    # 8. Fetch full user and company data
    user = await storage.get_oauth_user_by_id(user_id)
    company = await storage.get_company(company_id)

    logger.info(f"Dev login successful for {email}")

    # 9. Return same TokenResponse as OAuth callback
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer",
        expires_in=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=OAuthUserResponse(**user),
        company=CompanyResponse(**company)
    )


@router.post("/complete-onboarding")
async def complete_onboarding(request: CompleteOnboardingRequest):
    """
    Complete onboarding for a new user who signed up via Google OAuth.

    Creates company + admin user from a short-lived onboarding token.

    Args:
        request: Onboarding data with token, company name, and user name
    """
    storage = get_storage()

    # 1. Verify onboarding token
    payload = verify_token(request.onboarding_token)
    if not payload or payload.get("type") != "onboarding":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired onboarding token"
        )

    google_id = payload["google_id"]
    email = payload["email"]
    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    picture_url = payload.get("picture_url")

    # 2. Check user doesn't already exist
    existing_user = await storage.get_oauth_user_by_google_id(google_id)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists"
        )

    # 3. Create company
    domain = email.split("@")[1] if "@" in email else None
    company_id = await storage.create_company(
        name=request.company_name,
        domain=domain
    )

    # 4. Create admin user
    user_id = await storage.create_oauth_user(
        google_id=google_id,
        email=email,
        company_id=company_id,
        role="ADMIN",
        first_name=first_name,
        last_name=last_name,
        picture_url=picture_url
    )

    # 5. Log event
    await storage.log_auth_event(
        event_type="onboarding_complete",
        company_id=company_id,
        user_id=user_id,
        email=email,
        metadata={"company_name": request.company_name}
    )

    # 6. Generate tokens (same as normal login)
    access_token = create_access_token(user_id, company_id, email, "ADMIN")
    refresh_token_str = create_refresh_token()

    expires_at = datetime.utcnow() + timedelta(days=auth_settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await storage.create_session(user_id, refresh_token_str, expires_at)

    # 7. Return full token response
    user = await storage.get_oauth_user_by_id(user_id)
    company = await storage.get_company(company_id)

    logger.info(f"Onboarding complete for {email}, company: {request.company_name}")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer",
        expires_in=auth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=OAuthUserResponse(**user),
        company=CompanyResponse(**company)
    )


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Update current user's profile (first name and last name).
    """
    storage = get_storage()

    await storage.update_oauth_user(
        user_id=current_user.id,
        first_name=request.first_name,
        last_name=request.last_name
    )

    # Return updated user
    user = await storage.get_oauth_user_by_id(current_user.id)
    company = await storage.get_company(current_user.company_id)

    logger.info(f"Profile updated for {current_user.email}")

    return {
        "user": OAuthUserResponse(**user),
        "company": CompanyResponse(**company)
    }


@router.put("/company")
async def update_company(
    request: UpdateCompanyRequest,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Update company name (admin only).
    """
    storage = get_storage()

    success = await storage.update_company(
        company_id=current_user.company_id,
        name=request.name
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    company = await storage.get_company(current_user.company_id)

    logger.info(f"Company updated by {current_user.email}: {request.name}")

    return {"company": CompanyResponse(**company)}


@router.delete("/account")
async def delete_account(current_user: CurrentUser = Depends(get_current_user)):
    """
    Delete the current user's account.

    If this is the last user in the company, all company data will be deleted in cascade.
    This includes:
    - All users in the company
    - All teams
    - All JIRA instances and configurations
    - All worklogs, epics, and issues
    - All billing data
    - All logs and sessions

    WARNING: This action is irreversible.

    Returns:
        - message: Success message
        - company_deleted: True if company was also deleted (last user)
    """
    storage = get_storage()

    user_id = current_user.id
    company_id = current_user.company_id
    email = current_user.email

    # Log BEFORE deletion
    await storage.log_auth_event(
        event_type="account_deletion_initiated",
        company_id=company_id,
        user_id=user_id,
        email=email
    )

    # Count users in company (before deletion)
    user_count = await storage.count_users_in_company(company_id)

    logger.warning(f"Account deletion initiated by {email}, company has {user_count} user(s)")

    # Delete the user
    deleted = await storage.delete_oauth_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    company_deleted = False

    # If this was the last user, delete the entire company and all data
    if user_count == 1:
        logger.warning(f"Last user deleted, cascading company deletion for company_id={company_id}")
        company_deleted = await storage.delete_company_cascade(company_id)

        if company_deleted:
            logger.warning(f"Company {company_id} and all associated data deleted (cascade)")

    logger.info(f"Account deleted successfully: {email}, company_deleted={company_deleted}")

    return {
        "message": "Account deleted successfully",
        "company_deleted": company_deleted
    }


@router.get("/config")
async def get_auth_config():
    """
    Get public authentication configuration.

    Returns information about available authentication methods.
    Frontend uses this to conditionally show/hide the dev login button.

    No sensitive data is exposed - only flags.
    """
    return {
        "dev_mode": auth_settings.DEV_MODE,
        "oauth_enabled": True,
        "oauth_provider": "google"
    }
