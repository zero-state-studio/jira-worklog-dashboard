"""
Invitations Router - Invite users to join a company.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
import secrets

from ..models import InvitationCreate, InvitationResponse
from ..auth.dependencies import require_admin, CurrentUser
from ..auth_config import auth_settings
from ..cache import get_storage
from ..email_service import send_invitation_email
from ..logging_config import get_logger


router = APIRouter(prefix="/api/invitations", tags=["invitations"])
logger = get_logger(__name__)


@router.post("", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    invitation: InvitationCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Create a new invitation to join the company.

    Requires ADMIN role.

    Args:
        invitation: Invitation details (email, role)
        current_user: Current authenticated admin user

    Returns:
        Created invitation
    """
    storage = get_storage()

    # Validate role
    valid_roles = ["ADMIN", "MANAGER", "USER"]
    if invitation.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Check if user already exists
    existing_user = await storage.get_oauth_user_by_email(
        invitation.email,
        company_id=current_user.company_id
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists in your company"
        )

    # Check if pending invitation already exists
    pending_invitation = await storage.get_invitation_by_email(invitation.email)
    if pending_invitation and pending_invitation["company_id"] == current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pending invitation already exists for this email"
        )

    # Generate secure token
    token = secrets.token_urlsafe(32)

    # Set expiration
    expires_at = datetime.utcnow() + timedelta(hours=auth_settings.INVITATION_EXPIRE_HOURS)

    # Create invitation
    invitation_id = await storage.create_invitation(
        company_id=current_user.company_id,
        email=invitation.email,
        role=invitation.role,
        invited_by=current_user.id,
        token=token,
        expires_at=expires_at
    )

    logger.info(f"Invitation created for {invitation.email} by {current_user.email}")

    # Get company info for email
    company = await storage.get_company(current_user.company_id)

    # Send invitation email
    try:
        await send_invitation_email(
            to_email=invitation.email,
            invitation_token=token,
            company_name=company["name"],
            invited_by_email=current_user.email
        )
        logger.info(f"Invitation email sent to {invitation.email}")
    except Exception as e:
        logger.error(f"Failed to send invitation email: {e}")
        # Don't fail the request - invitation is still created

    # Log audit event
    await storage.log_auth_event(
        event_type="invitation_created",
        company_id=current_user.company_id,
        user_id=current_user.id,
        email=invitation.email,
        metadata={"role": invitation.role, "invitation_id": invitation_id}
    )

    # Get created invitation
    created_invitation = await storage.get_invitation_by_token(token)

    return InvitationResponse(
        id=created_invitation["id"],
        company_id=created_invitation["company_id"],
        email=created_invitation["email"],
        role=created_invitation["role"],
        invited_by=created_invitation["invited_by"],
        token=created_invitation["token"],
        status=created_invitation["status"],
        expires_at=created_invitation["expires_at"],
        created_at=datetime.fromisoformat(created_invitation["created_at"])
    )


@router.get("", response_model=list[InvitationResponse])
async def list_invitations(
    status_filter: str = None,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    List all invitations for the company.

    Requires ADMIN role.

    Args:
        status_filter: Optional status filter (PENDING, ACCEPTED, EXPIRED, REVOKED)
        current_user: Current authenticated admin user

    Returns:
        List of invitations
    """
    storage = get_storage()

    invitations = await storage.list_company_invitations(
        company_id=current_user.company_id,
        status=status_filter
    )

    return [
        InvitationResponse(
            id=inv["id"],
            company_id=inv["company_id"],
            email=inv["email"],
            role=inv["role"],
            invited_by=inv["invited_by"],
            token=inv["token"],
            status=inv["status"],
            expires_at=inv["expires_at"],
            created_at=datetime.fromisoformat(inv["created_at"])
        )
        for inv in invitations
    ]


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invitation(
    invitation_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Revoke (cancel) an invitation.

    Requires ADMIN role.

    Args:
        invitation_id: Invitation ID to revoke
        current_user: Current authenticated admin user
    """
    storage = get_storage()

    # Get invitation to verify it belongs to current company
    invitations = await storage.list_company_invitations(current_user.company_id)
    invitation = next((inv for inv in invitations if inv["id"] == invitation_id), None)

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    # Update status to REVOKED
    await storage.update_invitation_status(invitation_id, "REVOKED")

    logger.info(f"Invitation {invitation_id} revoked by {current_user.email}")

    # Log audit event
    await storage.log_auth_event(
        event_type="invitation_revoked",
        company_id=current_user.company_id,
        user_id=current_user.id,
        email=invitation["email"],
        metadata={"invitation_id": invitation_id}
    )

    return None
