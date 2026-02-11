"""
Settings API router - manage users and teams in database.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
import httpx
import logging

logger = logging.getLogger(__name__)

from ..models import (
    AppConfig,
    TeamCreate, TeamUpdate, TeamInDB, TeamWithMembers,
    UserCreate, UserUpdate, UserInDB,
    FetchAccountIdRequest, FetchAccountIdResponse,
    ImportConfigResponse,
    BulkUserCreateRequest, BulkUserCreateResult, BulkUserCreateResponse,
    BulkFetchAccountResult, BulkFetchAccountSummary, BulkFetchAccountResponse,
    HolidayCreate, HolidayUpdate,
)
from ..config import get_config
from ..cache import get_storage
from ..jira_client import JiraClient
from ..auth.dependencies import get_current_user, require_admin, CurrentUser

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ========== Teams Endpoints ==========

@router.get("/teams", response_model=list[TeamInDB])
async def list_teams(current_user: CurrentUser = Depends(get_current_user)):
    """List all teams with member counts for current user's company."""
    storage = get_storage()
    teams = await storage.get_all_teams(current_user.company_id)
    return [TeamInDB(**t) for t in teams]


@router.post("/teams", response_model=TeamInDB)
async def create_team(team: TeamCreate, current_user: CurrentUser = Depends(require_admin)):
    """Create a new team (ADMIN only)."""
    storage = get_storage()

    # Check if team name already exists in this company
    existing = await storage.get_team_by_name(team.name, current_user.company_id)
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")

    team_id = await storage.create_team(team.name, current_user.company_id)
    created = await storage.get_team(team_id, current_user.company_id)
    return TeamInDB(**created, member_count=0)


@router.get("/teams/{team_id}", response_model=TeamWithMembers)
async def get_team(team_id: int, current_user: CurrentUser = Depends(get_current_user)):
    """Get a team by ID with its members (scoped to current user's company)."""
    storage = get_storage()

    team = await storage.get_team(team_id, current_user.company_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    members = await storage.get_users_by_team(team_id, current_user.company_id)
    return TeamWithMembers(
        **team,
        member_count=len(members),
        members=[UserInDB(**m) for m in members]
    )


@router.put("/teams/{team_id}", response_model=TeamInDB)
async def update_team(team_id: int, team: TeamUpdate, current_user: CurrentUser = Depends(require_admin)):
    """Update a team (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_team(team_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.name:
        # Check if new name already exists in this company
        name_check = await storage.get_team_by_name(team.name, current_user.company_id)
        if name_check and name_check["id"] != team_id:
            raise HTTPException(status_code=400, detail="Team name already exists")

        await storage.update_team(team_id, team.name, current_user.company_id)

    updated = await storage.get_team(team_id, current_user.company_id)
    teams = await storage.get_all_teams(current_user.company_id)
    team_data = next((t for t in teams if t["id"] == team_id), updated)
    return TeamInDB(**team_data)


@router.delete("/teams/{team_id}")
async def delete_team(team_id: int, current_user: CurrentUser = Depends(require_admin)):
    """Delete a team (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_team(team_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")

    await storage.delete_team(team_id, current_user.company_id)
    return {"success": True, "message": "Team deleted"}


# ========== Users Endpoints ==========

@router.get("/users", response_model=list[UserInDB])
async def list_users(current_user: CurrentUser = Depends(get_current_user)):
    """List all users with team info and JIRA accounts for current user's company."""
    storage = get_storage()
    users = await storage.get_all_users(current_user.company_id)
    return [UserInDB(
        id=u["id"],
        email=u["email"],
        first_name=u["first_name"],
        last_name=u["last_name"],
        team_id=u["team_id"],
        team_name=u["team_name"],
        created_at=u["created_at"],
        updated_at=u["updated_at"],
        jira_accounts=u["jira_accounts"]
    ) for u in users]


@router.post("/users", response_model=UserInDB)
async def create_user(user: UserCreate, current_user: CurrentUser = Depends(require_admin)):
    """Create a new user (ADMIN only)."""
    storage = get_storage()

    # Check if email already exists in this company
    existing = await storage.get_user_by_email(user.email, current_user.company_id)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Validate team_id if provided (must belong to company)
    if user.team_id:
        team = await storage.get_team(user.team_id, current_user.company_id)
        if not team:
            raise HTTPException(status_code=400, detail="Team not found")

    user_id = await storage.create_user(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        team_id=user.team_id,
        company_id=current_user.company_id
    )
    created = await storage.get_user(user_id, current_user.company_id)
    return UserInDB(
        id=created["id"],
        email=created["email"],
        first_name=created["first_name"],
        last_name=created["last_name"],
        team_id=created["team_id"],
        team_name=created["team_name"],
        created_at=created["created_at"],
        updated_at=created["updated_at"],
        jira_accounts=created["jira_accounts"]
    )


@router.get("/users/{user_id}", response_model=UserInDB)
async def get_user(user_id: int, current_user: CurrentUser = Depends(get_current_user)):
    """Get a user by ID (scoped to current user's company)."""
    storage = get_storage()

    user = await storage.get_user(user_id, current_user.company_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserInDB(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        team_id=user["team_id"],
        team_name=user["team_name"],
        created_at=user["created_at"],
        updated_at=user["updated_at"],
        jira_accounts=user["jira_accounts"]
    )


@router.put("/users/{user_id}", response_model=UserInDB)
async def update_user(user_id: int, user: UserUpdate, current_user: CurrentUser = Depends(require_admin)):
    """Update a user (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_user(user_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {}

    if user.email is not None:
        # Check if new email already exists in this company
        email_check = await storage.get_user_by_email(user.email, current_user.company_id)
        if email_check and email_check["id"] != user_id:
            raise HTTPException(status_code=400, detail="Email already exists")
        update_data["email"] = user.email

    if user.first_name is not None:
        update_data["first_name"] = user.first_name

    if user.last_name is not None:
        update_data["last_name"] = user.last_name

    if user.team_id is not None:
        if user.team_id > 0:
            team = await storage.get_team(user.team_id, current_user.company_id)
            if not team:
                raise HTTPException(status_code=400, detail="Team not found")
        update_data["team_id"] = user.team_id if user.team_id > 0 else None

    if update_data:
        await storage.update_user(user_id, current_user.company_id, **update_data)

    updated = await storage.get_user(user_id, current_user.company_id)
    return UserInDB(
        id=updated["id"],
        email=updated["email"],
        first_name=updated["first_name"],
        last_name=updated["last_name"],
        team_id=updated["team_id"],
        team_name=updated["team_name"],
        created_at=updated["created_at"],
        updated_at=updated["updated_at"],
        jira_accounts=updated["jira_accounts"]
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: CurrentUser = Depends(require_admin)):
    """Delete a user (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_user(user_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    await storage.delete_user(user_id, current_user.company_id)
    return {"success": True, "message": "User deleted"}


def extract_name_from_email(email: str) -> tuple[str, str]:
    """
    Extract first_name and last_name from email address.

    Examples:
    - mario.rossi@example.com -> ("Mario", "Rossi")
    - m.rossi@example.com -> ("M", "Rossi")
    - mrossi@example.com -> ("Mrossi", "")
    - mario_rossi@example.com -> ("Mario", "Rossi")
    """
    import re

    # Get the local part (before @)
    local_part = email.split("@")[0].lower()

    # Split by common separators (., -, _)
    parts = re.split(r'[.\-_]', local_part)
    parts = [p for p in parts if p]  # Remove empty strings

    if len(parts) >= 2:
        # First part is first_name, last part is last_name
        first_name = parts[0].capitalize()
        last_name = parts[-1].capitalize()
    elif len(parts) == 1:
        # Single part - use as first_name, empty last_name
        first_name = parts[0].capitalize()
        last_name = ""
    else:
        # Fallback
        first_name = local_part.capitalize()
        last_name = ""

    return first_name, last_name


@router.post("/users/bulk", response_model=BulkUserCreateResponse)
async def create_users_bulk(
    request: BulkUserCreateRequest,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Create multiple users from a list of emails (ADMIN only).

    Name and surname are extracted automatically from email addresses.
    Duplicate emails or already existing users are skipped.
    """
    import re

    storage = get_storage()
    results = []
    created_count = 0
    failed_count = 0

    # Email validation regex
    email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

    # Validate team_id if provided (must belong to company)
    if request.team_id:
        team = await storage.get_team(request.team_id, current_user.company_id)
        if not team:
            raise HTTPException(status_code=400, detail="Team not found")

    # Process each email
    seen_emails = set()
    for email in request.emails:
        email = email.strip().lower()

        # Skip empty emails
        if not email:
            continue

        # Skip duplicates in the same request
        if email in seen_emails:
            results.append(BulkUserCreateResult(
                email=email,
                success=False,
                error="Duplicato nella richiesta"
            ))
            failed_count += 1
            continue
        seen_emails.add(email)

        # Validate email format
        if not email_regex.match(email):
            results.append(BulkUserCreateResult(
                email=email,
                success=False,
                error="Formato email non valido"
            ))
            failed_count += 1
            continue

        # Check if user already exists in this company
        existing = await storage.get_user_by_email(email, current_user.company_id)
        if existing:
            results.append(BulkUserCreateResult(
                email=email,
                success=False,
                error="Utente già esistente"
            ))
            failed_count += 1
            continue

        # Extract name from email
        first_name, last_name = extract_name_from_email(email)

        try:
            user_id = await storage.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                team_id=request.team_id,
                company_id=current_user.company_id
            )
            results.append(BulkUserCreateResult(
                email=email,
                success=True,
                user_id=user_id
            ))
            created_count += 1
        except Exception as e:
            results.append(BulkUserCreateResult(
                email=email,
                success=False,
                error=str(e)
            ))
            failed_count += 1

    return BulkUserCreateResponse(
        total=len(results),
        created=created_count,
        failed=failed_count,
        results=results
    )


# ========== JIRA Account Endpoints ==========

@router.post("/users/{user_id}/fetch-account/{jira_instance}", response_model=FetchAccountIdResponse)
async def fetch_jira_account_id(
    user_id: int,
    jira_instance: str,
    current_user: CurrentUser = Depends(require_admin),
    config: AppConfig = Depends(get_config)
):
    """Fetch and store JIRA accountId for a user from a specific instance (ADMIN only)."""
    from ..models import JiraInstanceConfig
    storage = get_storage()

    # Get user (scoped to company)
    user = await storage.get_user(user_id, current_user.company_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find JIRA instance from database only (no fallback to config.yaml)
    instance_config = None

    db_instance = await storage.get_jira_instance_by_name(jira_instance, current_user.company_id)
    if db_instance:
        instance_config = JiraInstanceConfig(
            name=db_instance["name"],
            url=db_instance["url"],
            email=db_instance["email"],
            api_token=db_instance["api_token"],
            tempo_api_token=db_instance.get("tempo_api_token")
        )

    if not instance_config:
        raise HTTPException(status_code=404, detail=f"JIRA instance '{jira_instance}' not found")

    # Search for user in JIRA
    client = JiraClient(instance_config)
    account_id = await client.search_user_by_email(user["email"])

    if not account_id:
        raise HTTPException(
            status_code=404,
            detail=f"User with email '{user['email']}' not found in JIRA instance '{jira_instance}'"
        )

    # Save the account ID
    await storage.set_user_jira_account(user_id, jira_instance, account_id)

    return FetchAccountIdResponse(
        jira_instance=jira_instance,
        account_id=account_id,
        email=user["email"]
    )


@router.delete("/users/{user_id}/jira-accounts/{jira_instance}")
async def delete_jira_account(
    user_id: int,
    jira_instance: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete a user's JIRA account mapping (ADMIN only)."""
    storage = get_storage()

    # Verify user belongs to company
    user = await storage.get_user(user_id, current_user.company_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    deleted = await storage.delete_user_jira_account(user_id, jira_instance)
    if not deleted:
        raise HTTPException(status_code=404, detail="JIRA account mapping not found")

    return {"success": True, "message": "JIRA account mapping deleted"}


@router.post("/users/bulk-fetch-accounts", response_model=BulkFetchAccountResponse)
async def bulk_fetch_jira_accounts(current_user: CurrentUser = Depends(require_admin)):
    """Fetch JIRA account IDs for all users across all JIRA instances (ADMIN only, scoped to company)."""
    from ..models import JiraInstanceConfig
    storage = get_storage()

    users = await storage.get_all_users(current_user.company_id)
    instances = await storage.get_all_jira_instances(current_user.company_id, include_credentials=True)

    if not users:
        return BulkFetchAccountResponse(
            results=[],
            summary=BulkFetchAccountSummary(total=0, success=0, failed=0, skipped=0)
        )
    if not instances:
        return BulkFetchAccountResponse(
            results=[],
            summary=BulkFetchAccountSummary(total=0, success=0, failed=0, skipped=0)
        )

    results = []
    success_count = 0
    failed_count = 0
    skipped_count = 0

    for user in users:
        existing_accounts = {ja["jira_instance"] for ja in (user.get("jira_accounts") or [])}

        for inst in instances:
            instance_name = inst["name"]

            # Skip if already has account ID for this instance
            if instance_name in existing_accounts:
                skipped_count += 1
                continue

            try:
                # Try to fetch account ID from this JIRA instance
                logger.info(f"Fetching account ID for {user['email']} from {instance_name}")

                instance_config = JiraInstanceConfig(
                    name=inst["name"],
                    url=inst["url"],
                    email=inst["email"],
                    api_token=inst["api_token"],
                    tempo_api_token=inst.get("tempo_api_token")
                )
                client = JiraClient(instance_config)
                account_id = await client.search_user_by_email(user["email"])

                if not account_id:
                    logger.warning(f"No JIRA account found for {user['email']} in {instance_name}")
                    results.append(BulkFetchAccountResult(
                        user_id=user['id'],
                        user_name=f"{user['first_name']} {user['last_name']}",
                        email=user['email'],
                        jira_instance=instance_name,
                        status="failed",
                        error="No JIRA account found"
                    ))
                    failed_count += 1
                    continue

                # Update in database
                await storage.set_user_jira_account(
                    user_id=user['id'],
                    jira_instance=instance_name,
                    account_id=account_id
                )

                logger.info(f"Successfully set account ID {account_id} for {user['email']} in {instance_name}")
                results.append(BulkFetchAccountResult(
                    user_id=user['id'],
                    user_name=f"{user['first_name']} {user['last_name']}",
                    email=user['email'],
                    jira_instance=instance_name,
                    status="success",
                    account_id=account_id
                ))
                success_count += 1

            except httpx.RequestError as e:
                # Network/connection errors
                logger.error(f"Connection error fetching account for {user['email']} from {instance_name}: {e}")
                results.append(BulkFetchAccountResult(
                    user_id=user['id'],
                    user_name=f"{user['first_name']} {user['last_name']}",
                    email=user['email'],
                    jira_instance=instance_name,
                    status="failed",
                    error=f"Connection error: {str(e)}"
                ))
                failed_count += 1

            except httpx.HTTPStatusError as e:
                # HTTP errors (401, 403, 404, etc.)
                logger.error(f"HTTP error {e.response.status_code} for {user['email']} from {instance_name}")
                results.append(BulkFetchAccountResult(
                    user_id=user['id'],
                    user_name=f"{user['first_name']} {user['last_name']}",
                    email=user['email'],
                    jira_instance=instance_name,
                    status="failed",
                    error=f"HTTP {e.response.status_code}: {e.response.text[:100]}"
                ))
                failed_count += 1

            except Exception as e:
                # Generic errors (should be rare now)
                logger.exception(f"Unexpected error for {user['email']} from {instance_name}: {e}")
                results.append(BulkFetchAccountResult(
                    user_id=user['id'],
                    user_name=f"{user['first_name']} {user['last_name']}",
                    email=user['email'],
                    jira_instance=instance_name,
                    status="failed",
                    error=f"Unexpected error: {str(e)}"
                ))
                failed_count += 1

    return BulkFetchAccountResponse(
        results=results,
        summary=BulkFetchAccountSummary(
            total=success_count + failed_count + skipped_count,
            success=success_count,
            failed=failed_count,
            skipped=skipped_count
        )
    )


# ========== Import Endpoints ==========

@router.post("/import-config", response_model=ImportConfigResponse)
async def import_from_config(
    current_user: CurrentUser = Depends(require_admin),
    config: AppConfig = Depends(get_config)
):
    """Import teams, users, and JIRA instances from config.yaml to database (ADMIN only)."""
    storage = get_storage()

    # Convert config teams to dict format
    teams_config = [
        {
            "name": team.name,
            "members": [
                {
                    "email": member.email,
                    "first_name": member.first_name,
                    "last_name": member.last_name
                }
                for member in team.members
            ]
        }
        for team in config.teams
    ]

    result = await storage.import_teams_from_config(teams_config, current_user.company_id)

    # Import JIRA instances (scoped to company)
    jira_instances_created = 0
    for instance in config.jira_instances:
        # Check if instance already exists in this company
        existing = await storage.get_jira_instance_by_name(instance.name, current_user.company_id)
        if not existing:
            await storage.create_jira_instance(
                name=instance.name,
                url=instance.url,
                email=instance.email,
                api_token=instance.api_token,
                tempo_api_token=instance.tempo_api_token,
                company_id=current_user.company_id
            )
            jira_instances_created += 1

    return ImportConfigResponse(
        teams_created=result["teams_created"],
        users_created=result["users_created"],
        jira_instances_created=jira_instances_created
    )


@router.get("/jira-instances")
async def get_jira_instances(current_user: CurrentUser = Depends(get_current_user)):
    """Get list of JIRA instances from database (scoped to company)."""
    storage = get_storage()
    instances = await storage.get_all_jira_instances(current_user.company_id, include_credentials=False)

    # Return database instances only (no fallback to config.yaml)
    return {"instances": instances}


@router.post("/jira-instances")
async def create_jira_instance(data: dict, current_user: CurrentUser = Depends(require_admin)):
    """Create a new JIRA instance (ADMIN only)."""
    storage = get_storage()

    name = data.get("name")
    url = data.get("url")
    email = data.get("email")
    api_token = data.get("api_token")
    tempo_api_token = data.get("tempo_api_token")
    billing_client_id = data.get("billing_client_id")

    if not all([name, url, email, api_token]):
        raise HTTPException(status_code=400, detail="name, url, email, and api_token are required")

    # Check if name already exists in this company
    existing = await storage.get_jira_instance_by_name(name, current_user.company_id)
    if existing:
        raise HTTPException(status_code=400, detail="Instance name already exists")

    instance_id = await storage.create_jira_instance(
        name=name,
        url=url,
        email=email,
        api_token=api_token,
        tempo_api_token=tempo_api_token,
        billing_client_id=billing_client_id,
        company_id=current_user.company_id
    )

    instance = await storage.get_jira_instance(instance_id, current_user.company_id)

    # Try to fetch and cache issue types (non-blocking)
    try:
        from ..models import JiraInstanceConfig
        inst_config = JiraInstanceConfig(
            name=name, url=url, email=email,
            api_token=api_token, tempo_api_token=tempo_api_token
        )
        client = JiraClient(inst_config)
        issue_types = await client.get_all_issue_types()
        if issue_types:
            await storage.save_instance_issue_types(instance_id, issue_types)
    except Exception:
        pass  # Non-blocking

    # Don't expose credentials in response
    return {
        "id": instance["id"],
        "name": instance["name"],
        "url": instance["url"],
        "is_active": instance["is_active"],
        "has_tempo": bool(instance.get("tempo_api_token")),
        "default_project_key": instance.get("default_project_key")
    }


@router.get("/jira-instances/{instance_id}")
async def get_jira_instance(
    instance_id: int,
    include_credentials: bool = False,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a JIRA instance by ID (scoped to company)."""
    storage = get_storage()

    instance = await storage.get_jira_instance(instance_id, current_user.company_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    result = {
        "id": instance["id"],
        "name": instance["name"],
        "url": instance["url"],
        "billing_client_id": instance.get("billing_client_id"),
        "is_active": instance["is_active"],
        "has_tempo": bool(instance.get("tempo_api_token")),
        "default_project_key": instance.get("default_project_key"),
        "created_at": instance["created_at"],
        "updated_at": instance["updated_at"]
    }

    if include_credentials:
        result["email"] = instance["email"]
        result["api_token"] = instance["api_token"]
        result["tempo_api_token"] = instance.get("tempo_api_token")

    return result


@router.put("/jira-instances/{instance_id}")
async def update_jira_instance(
    instance_id: int,
    data: dict,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update a JIRA instance (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_jira_instance(instance_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Check name uniqueness if changing (within company)
    if data.get("name") and data["name"] != existing["name"]:
        name_check = await storage.get_jira_instance_by_name(data["name"], current_user.company_id)
        if name_check:
            raise HTTPException(status_code=400, detail="Instance name already exists")

    await storage.update_jira_instance(instance_id, current_user.company_id, **data)

    updated = await storage.get_jira_instance(instance_id, current_user.company_id)
    return {
        "id": updated["id"],
        "name": updated["name"],
        "url": updated["url"],
        "billing_client_id": updated.get("billing_client_id"),
        "is_active": updated["is_active"],
        "has_tempo": bool(updated.get("tempo_api_token")),
        "default_project_key": updated.get("default_project_key")
    }


@router.delete("/jira-instances/{instance_id}")
async def delete_jira_instance(instance_id: int, current_user: CurrentUser = Depends(require_admin)):
    """Delete a JIRA instance (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_jira_instance(instance_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Instance not found")

    await storage.delete_jira_instance(instance_id, current_user.company_id)
    return {"success": True, "message": "Instance deleted"}


@router.post("/jira-instances/{instance_id}/test")
async def test_jira_instance(instance_id: int, current_user: CurrentUser = Depends(require_admin)):
    """Test connection to a JIRA instance (ADMIN only)."""
    storage = get_storage()

    instance = await storage.get_jira_instance(instance_id, current_user.company_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Create a temporary config for the JiraClient
    from ..models import JiraInstanceConfig
    instance_config = JiraInstanceConfig(
        name=instance["name"],
        url=instance["url"],
        email=instance["email"],
        api_token=instance["api_token"],
        tempo_api_token=instance.get("tempo_api_token")
    )

    try:
        client = JiraClient(instance_config)
        # Try to get current user to test connection
        result = await client.test_connection()

        # Fetch and cache issue types on successful test
        try:
            issue_types = await client.get_all_issue_types()
            if issue_types:
                await storage.save_instance_issue_types(instance_id, issue_types)
        except Exception:
            pass  # Non-blocking: don't fail test if issue type fetch fails

        return {"success": True, "message": "Connection successful", "user": result}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/jira-instances/{instance_id}/issue-types")
async def get_instance_issue_types(instance_id: int, current_user: CurrentUser = Depends(get_current_user)):
    """Get cached issue types for a JIRA instance."""
    storage = get_storage()

    instance = await storage.get_jira_instance(instance_id, current_user.company_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    types = await storage.get_instance_issue_types(instance_id)
    return {"issue_types": types}


# ========== Complementary Groups Endpoints ==========

@router.get("/complementary-groups")
async def list_complementary_groups(current_user: CurrentUser = Depends(get_current_user)):
    """List all complementary groups with their members (scoped to company)."""
    storage = get_storage()
    groups = await storage.get_all_complementary_groups(current_user.company_id)
    return {"groups": groups}


@router.post("/complementary-groups")
async def create_complementary_group(data: dict, current_user: CurrentUser = Depends(require_admin)):
    """Create a new complementary group (ADMIN only)."""
    storage = get_storage()

    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    primary_instance_id = data.get("primary_instance_id")
    member_ids = data.get("member_ids", [])

    # Validate primary_instance_id if provided (must belong to company)
    if primary_instance_id:
        instance = await storage.get_jira_instance(primary_instance_id, current_user.company_id)
        if not instance:
            raise HTTPException(status_code=400, detail="Primary instance not found")

    group_id = await storage.create_complementary_group(
        name=name,
        primary_instance_id=primary_instance_id,
        company_id=current_user.company_id
    )

    # Add members if provided (validate each belongs to company)
    for instance_id in member_ids:
        instance = await storage.get_jira_instance(instance_id, current_user.company_id)
        if instance:
            await storage.add_instance_to_complementary_group(group_id, instance_id)

    group = await storage.get_complementary_group(group_id, current_user.company_id)
    return group


@router.get("/complementary-groups/{group_id}")
async def get_complementary_group(group_id: int, current_user: CurrentUser = Depends(get_current_user)):
    """Get a complementary group with its members (scoped to company)."""
    storage = get_storage()

    group = await storage.get_complementary_group(group_id, current_user.company_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return group


@router.put("/complementary-groups/{group_id}")
async def update_complementary_group(
    group_id: int,
    data: dict,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update a complementary group (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_complementary_group(group_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    # Update basic fields
    if "name" in data or "primary_instance_id" in data:
        await storage.update_complementary_group(
            group_id,
            current_user.company_id,
            name=data.get("name"),
            primary_instance_id=data.get("primary_instance_id")
        )

    # Update members if provided
    if "member_ids" in data:
        await storage.set_complementary_group_members(group_id, data["member_ids"])

    updated = await storage.get_complementary_group(group_id, current_user.company_id)
    return updated


@router.delete("/complementary-groups/{group_id}")
async def delete_complementary_group(group_id: int, current_user: CurrentUser = Depends(require_admin)):
    """Delete a complementary group (ADMIN only)."""
    storage = get_storage()

    existing = await storage.get_complementary_group(group_id, current_user.company_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    await storage.delete_complementary_group(group_id, current_user.company_id)
    return {"success": True, "message": "Group deleted"}


@router.post("/complementary-groups/{group_id}/members/{instance_id}")
async def add_member_to_group(
    group_id: int,
    instance_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Add an instance to a complementary group (ADMIN only)."""
    storage = get_storage()

    # Verify group belongs to company
    group = await storage.get_complementary_group(group_id, current_user.company_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify instance belongs to company
    instance = await storage.get_jira_instance(instance_id, current_user.company_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    added = await storage.add_instance_to_complementary_group(group_id, instance_id)
    if not added:
        raise HTTPException(status_code=400, detail="Instance already in group")

    return {"success": True, "message": "Instance added to group"}


@router.delete("/complementary-groups/{group_id}/members/{instance_id}")
async def remove_member_from_group(
    group_id: int,
    instance_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Remove an instance from a complementary group (ADMIN only)."""
    storage = get_storage()

    # Verify group belongs to company
    group = await storage.get_complementary_group(group_id, current_user.company_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    removed = await storage.remove_instance_from_complementary_group(group_id, instance_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Instance not in group")

    return {"success": True, "message": "Instance removed from group"}


# ========== Holidays Endpoints ==========

@router.get("/holidays/{year}")
async def get_holidays(year: int, country: str = "IT", current_user: CurrentUser = Depends(get_current_user)):
    """Get holidays for a year (scoped to company). Auto-seeds defaults if none exist."""
    storage = get_storage()

    holidays = await storage.get_holidays_for_year(year, current_user.company_id, country)

    # Auto-seed if empty for this year
    if not holidays:
        inserted = await storage.seed_holidays_for_year(year, current_user.company_id, country)
        if inserted > 0:
            holidays = await storage.get_holidays_for_year(year, current_user.company_id, country)

    active_count = sum(1 for h in holidays if h["is_active"])

    return {
        "year": year,
        "country": country,
        "holidays": holidays,
        "total": len(holidays),
        "active": active_count
    }


@router.post("/holidays")
async def create_holiday(data: HolidayCreate, current_user: CurrentUser = Depends(require_admin)):
    """Create a custom holiday (ADMIN only)."""
    storage = get_storage()

    try:
        holiday_id = await storage.create_holiday(
            data.name, data.holiday_date.isoformat(), data.country, current_user.company_id
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Holiday already exists for this date")

    return {"id": holiday_id, "success": True}


@router.put("/holidays/{holiday_id}")
async def update_holiday(
    holiday_id: int,
    data: HolidayUpdate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update a holiday (name, is_active) (ADMIN only)."""
    storage = get_storage()

    update_fields = {}
    if data.name is not None:
        update_fields["name"] = data.name
    if data.is_active is not None:
        update_fields["is_active"] = 1 if data.is_active else 0

    updated = await storage.update_holiday(holiday_id, current_user.company_id, **update_fields)
    if not updated:
        raise HTTPException(status_code=404, detail="Holiday not found")

    return {"success": True}


@router.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: int, current_user: CurrentUser = Depends(require_admin)):
    """Delete a holiday (ADMIN only)."""
    storage = get_storage()

    deleted = await storage.delete_holiday(holiday_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Holiday not found")

    return {"success": True}


@router.post("/holidays/{year}/seed")
async def seed_holidays(year: int, country: str = "IT", current_user: CurrentUser = Depends(require_admin)):
    """Re-seed default holidays for a year (won't duplicate existing) (ADMIN only)."""
    storage = get_storage()
    inserted = await storage.seed_holidays_for_year(year, current_user.company_id, country)
    return {"inserted": inserted, "year": year, "country": country}


# ========== Migration Endpoints ==========

@router.get("/migration/check")
async def check_legacy_data(current_user: CurrentUser = Depends(require_admin)):
    """
    Check if there are legacy records (company_id IS NULL) that need migration (ADMIN only).

    This endpoint checks all tables for records without a company_id assignment.
    These are typically records created before the multi-tenant implementation.
    """
    storage = get_storage()
    result = await storage.check_legacy_data()
    return result


@router.post("/migration/execute")
async def execute_migration(
    target_company_id: int = 1,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Migrate all legacy data (company_id IS NULL) to a specific company (ADMIN only).

    This is a one-time operation that assigns all legacy data to the specified company_id.
    By default, legacy data is assigned to company_id=1 for backward compatibility.

    **WARNING**: This operation cannot be easily reversed. Make sure to backup your
    database before running this migration.

    Args:
        target_company_id: The company ID to assign to legacy data (default: 1)
    """
    storage = get_storage()

    try:
        result = await storage.migrate_legacy_data(target_company_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
