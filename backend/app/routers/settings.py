"""
Settings API router - manage users and teams in database.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from ..models import (
    AppConfig,
    TeamCreate, TeamUpdate, TeamInDB, TeamWithMembers,
    UserCreate, UserUpdate, UserInDB,
    FetchAccountIdRequest, FetchAccountIdResponse,
    ImportConfigResponse,
    BulkUserCreateRequest, BulkUserCreateResult, BulkUserCreateResponse
)
from ..config import get_config
from ..cache import get_storage
from ..jira_client import JiraClient

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ========== Teams Endpoints ==========

@router.get("/teams", response_model=list[TeamInDB])
async def list_teams():
    """List all teams with member counts."""
    storage = get_storage()
    teams = await storage.get_all_teams()
    return [TeamInDB(**t) for t in teams]


@router.post("/teams", response_model=TeamInDB)
async def create_team(team: TeamCreate):
    """Create a new team."""
    storage = get_storage()

    # Check if team name already exists
    existing = await storage.get_team_by_name(team.name)
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")

    team_id = await storage.create_team(team.name)
    created = await storage.get_team(team_id)
    return TeamInDB(**created, member_count=0)


@router.get("/teams/{team_id}", response_model=TeamWithMembers)
async def get_team(team_id: int):
    """Get a team by ID with its members."""
    storage = get_storage()

    team = await storage.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    members = await storage.get_users_by_team(team_id)
    return TeamWithMembers(
        **team,
        member_count=len(members),
        members=[UserInDB(**m) for m in members]
    )


@router.put("/teams/{team_id}", response_model=TeamInDB)
async def update_team(team_id: int, team: TeamUpdate):
    """Update a team."""
    storage = get_storage()

    existing = await storage.get_team(team_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.name:
        # Check if new name already exists
        name_check = await storage.get_team_by_name(team.name)
        if name_check and name_check["id"] != team_id:
            raise HTTPException(status_code=400, detail="Team name already exists")

        await storage.update_team(team_id, team.name)

    updated = await storage.get_team(team_id)
    teams = await storage.get_all_teams()
    team_data = next((t for t in teams if t["id"] == team_id), updated)
    return TeamInDB(**team_data)


@router.delete("/teams/{team_id}")
async def delete_team(team_id: int):
    """Delete a team."""
    storage = get_storage()

    existing = await storage.get_team(team_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")

    await storage.delete_team(team_id)
    return {"success": True, "message": "Team deleted"}


# ========== Users Endpoints ==========

@router.get("/users", response_model=list[UserInDB])
async def list_users():
    """List all users with team info and JIRA accounts."""
    storage = get_storage()
    users = await storage.get_all_users()
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
async def create_user(user: UserCreate):
    """Create a new user."""
    storage = get_storage()

    # Check if email already exists
    existing = await storage.get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Validate team_id if provided
    if user.team_id:
        team = await storage.get_team(user.team_id)
        if not team:
            raise HTTPException(status_code=400, detail="Team not found")

    user_id = await storage.create_user(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        team_id=user.team_id
    )
    created = await storage.get_user(user_id)
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
async def get_user(user_id: int):
    """Get a user by ID."""
    storage = get_storage()

    user = await storage.get_user(user_id)
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
async def update_user(user_id: int, user: UserUpdate):
    """Update a user."""
    storage = get_storage()

    existing = await storage.get_user(user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {}

    if user.email is not None:
        # Check if new email already exists
        email_check = await storage.get_user_by_email(user.email)
        if email_check and email_check["id"] != user_id:
            raise HTTPException(status_code=400, detail="Email already exists")
        update_data["email"] = user.email

    if user.first_name is not None:
        update_data["first_name"] = user.first_name

    if user.last_name is not None:
        update_data["last_name"] = user.last_name

    if user.team_id is not None:
        if user.team_id > 0:
            team = await storage.get_team(user.team_id)
            if not team:
                raise HTTPException(status_code=400, detail="Team not found")
        update_data["team_id"] = user.team_id if user.team_id > 0 else None

    if update_data:
        await storage.update_user(user_id, **update_data)

    updated = await storage.get_user(user_id)
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
async def delete_user(user_id: int):
    """Delete a user."""
    storage = get_storage()

    existing = await storage.get_user(user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    await storage.delete_user(user_id)
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
async def create_users_bulk(request: BulkUserCreateRequest):
    """
    Create multiple users from a list of emails.

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

    # Validate team_id if provided
    if request.team_id:
        team = await storage.get_team(request.team_id)
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

        # Check if user already exists
        existing = await storage.get_user_by_email(email)
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
                team_id=request.team_id
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
    config: AppConfig = Depends(get_config)
):
    """Fetch and store JIRA accountId for a user from a specific instance."""
    from ..models import JiraInstanceConfig
    storage = get_storage()

    # Get user
    user = await storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find JIRA instance - first check database, then fallback to config.yaml
    instance_config = None

    # Try database first
    db_instance = await storage.get_jira_instance_by_name(jira_instance)
    if db_instance:
        instance_config = JiraInstanceConfig(
            name=db_instance["name"],
            url=db_instance["url"],
            email=db_instance["email"],
            api_token=db_instance["api_token"],
            tempo_api_token=db_instance.get("tempo_api_token")
        )
    else:
        # Fallback to config.yaml
        for inst in config.jira_instances:
            if inst.name == jira_instance:
                instance_config = inst
                break

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
async def delete_jira_account(user_id: int, jira_instance: str):
    """Delete a user's JIRA account mapping."""
    storage = get_storage()

    user = await storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    deleted = await storage.delete_user_jira_account(user_id, jira_instance)
    if not deleted:
        raise HTTPException(status_code=404, detail="JIRA account mapping not found")

    return {"success": True, "message": "JIRA account mapping deleted"}


@router.post("/users/bulk-fetch-accounts")
async def bulk_fetch_jira_accounts():
    """Fetch JIRA account IDs for all users across all JIRA instances."""
    from ..models import JiraInstanceConfig
    storage = get_storage()

    users = await storage.get_all_users()
    instances = await storage.get_all_jira_instances()

    if not users:
        return {"results": [], "summary": {"total": 0, "success": 0, "failed": 0, "skipped": 0}}
    if not instances:
        return {"results": [], "summary": {"total": 0, "success": 0, "failed": 0, "skipped": 0}}

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
                instance_config = JiraInstanceConfig(
                    name=inst["name"],
                    url=inst["url"],
                    email=inst["email"],
                    api_token=inst["api_token"],
                    tempo_api_token=inst.get("tempo_api_token")
                )
                client = JiraClient(instance_config)
                account_id = await client.search_user_by_email(user["email"])

                if account_id:
                    await storage.set_user_jira_account(user["id"], instance_name, account_id)
                    results.append({
                        "user_email": user["email"],
                        "user_name": f"{user['first_name']} {user['last_name']}",
                        "jira_instance": instance_name,
                        "success": True,
                        "account_id": account_id
                    })
                    success_count += 1
                else:
                    results.append({
                        "user_email": user["email"],
                        "user_name": f"{user['first_name']} {user['last_name']}",
                        "jira_instance": instance_name,
                        "success": False,
                        "error": "User not found in JIRA"
                    })
                    failed_count += 1

            except Exception as e:
                results.append({
                    "user_email": user["email"],
                    "user_name": f"{user['first_name']} {user['last_name']}",
                    "jira_instance": instance_name,
                    "success": False,
                    "error": str(e)
                })
                failed_count += 1

    return {
        "results": results,
        "summary": {
            "total": success_count + failed_count + skipped_count,
            "success": success_count,
            "failed": failed_count,
            "skipped": skipped_count
        }
    }


# ========== Import Endpoints ==========

@router.post("/import-config", response_model=ImportConfigResponse)
async def import_from_config(config: AppConfig = Depends(get_config)):
    """Import teams, users, and JIRA instances from config.yaml to database."""
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

    result = await storage.import_teams_from_config(teams_config)

    # Import JIRA instances
    jira_instances_created = 0
    for instance in config.jira_instances:
        # Check if instance already exists
        existing = await storage.get_jira_instance_by_name(instance.name)
        if not existing:
            await storage.create_jira_instance(
                name=instance.name,
                url=instance.url,
                email=instance.email,
                api_token=instance.api_token,
                tempo_api_token=instance.tempo_api_token
            )
            jira_instances_created += 1

    return ImportConfigResponse(
        teams_created=result["teams_created"],
        users_created=result["users_created"],
        jira_instances_created=jira_instances_created
    )


@router.get("/jira-instances")
async def get_jira_instances():
    """Get list of JIRA instances from database with fallback to config.yaml."""
    storage = get_storage()
    instances = await storage.get_all_jira_instances(include_credentials=False)

    # If database is empty, fallback to config.yaml
    if not instances:
        try:
            from ..config import get_config
            config = get_config()
            instances = [
                {
                    "id": idx,
                    "name": inst.name,
                    "url": inst.url,
                    "is_active": True,
                    "source": "config.yaml",  # Flag to indicate it's from config file
                    "created_at": None,
                    "updated_at": None
                }
                for idx, inst in enumerate(config.jira_instances, 1)
            ]
        except FileNotFoundError:
            instances = []

    return {"instances": instances}


@router.post("/jira-instances")
async def create_jira_instance(data: dict):
    """Create a new JIRA instance."""
    storage = get_storage()

    name = data.get("name")
    url = data.get("url")
    email = data.get("email")
    api_token = data.get("api_token")
    tempo_api_token = data.get("tempo_api_token")

    if not all([name, url, email, api_token]):
        raise HTTPException(status_code=400, detail="name, url, email, and api_token are required")

    # Check if name already exists
    existing = await storage.get_jira_instance_by_name(name)
    if existing:
        raise HTTPException(status_code=400, detail="Instance name already exists")

    instance_id = await storage.create_jira_instance(
        name=name,
        url=url,
        email=email,
        api_token=api_token,
        tempo_api_token=tempo_api_token
    )

    instance = await storage.get_jira_instance(instance_id)

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
async def get_jira_instance(instance_id: int, include_credentials: bool = False):
    """Get a JIRA instance by ID."""
    storage = get_storage()

    instance = await storage.get_jira_instance(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    result = {
        "id": instance["id"],
        "name": instance["name"],
        "url": instance["url"],
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
async def update_jira_instance(instance_id: int, data: dict):
    """Update a JIRA instance."""
    storage = get_storage()

    existing = await storage.get_jira_instance(instance_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Check name uniqueness if changing
    if data.get("name") and data["name"] != existing["name"]:
        name_check = await storage.get_jira_instance_by_name(data["name"])
        if name_check:
            raise HTTPException(status_code=400, detail="Instance name already exists")

    await storage.update_jira_instance(instance_id, **data)

    updated = await storage.get_jira_instance(instance_id)
    return {
        "id": updated["id"],
        "name": updated["name"],
        "url": updated["url"],
        "is_active": updated["is_active"],
        "has_tempo": bool(updated.get("tempo_api_token")),
        "default_project_key": updated.get("default_project_key")
    }


@router.delete("/jira-instances/{instance_id}")
async def delete_jira_instance(instance_id: int):
    """Delete a JIRA instance."""
    storage = get_storage()

    existing = await storage.get_jira_instance(instance_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Instance not found")

    await storage.delete_jira_instance(instance_id)
    return {"success": True, "message": "Instance deleted"}


@router.post("/jira-instances/{instance_id}/test")
async def test_jira_instance(instance_id: int):
    """Test connection to a JIRA instance."""
    storage = get_storage()

    instance = await storage.get_jira_instance(instance_id)
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
async def get_instance_issue_types(instance_id: int):
    """Get cached issue types for a JIRA instance."""
    storage = get_storage()

    instance = await storage.get_jira_instance(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    types = await storage.get_instance_issue_types(instance_id)
    return {"issue_types": types}


# ========== Complementary Groups Endpoints ==========

@router.get("/complementary-groups")
async def list_complementary_groups():
    """List all complementary groups with their members."""
    storage = get_storage()
    groups = await storage.get_all_complementary_groups()
    return {"groups": groups}


@router.post("/complementary-groups")
async def create_complementary_group(data: dict):
    """Create a new complementary group."""
    storage = get_storage()

    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    primary_instance_id = data.get("primary_instance_id")
    member_ids = data.get("member_ids", [])

    # Validate primary_instance_id if provided
    if primary_instance_id:
        instance = await storage.get_jira_instance(primary_instance_id)
        if not instance:
            raise HTTPException(status_code=400, detail="Primary instance not found")

    group_id = await storage.create_complementary_group(
        name=name,
        primary_instance_id=primary_instance_id
    )

    # Add members if provided
    for instance_id in member_ids:
        await storage.add_instance_to_complementary_group(group_id, instance_id)

    group = await storage.get_complementary_group(group_id)
    return group


@router.get("/complementary-groups/{group_id}")
async def get_complementary_group(group_id: int):
    """Get a complementary group with its members."""
    storage = get_storage()

    group = await storage.get_complementary_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return group


@router.put("/complementary-groups/{group_id}")
async def update_complementary_group(group_id: int, data: dict):
    """Update a complementary group."""
    storage = get_storage()

    existing = await storage.get_complementary_group(group_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    # Update basic fields
    if "name" in data or "primary_instance_id" in data:
        await storage.update_complementary_group(
            group_id,
            name=data.get("name"),
            primary_instance_id=data.get("primary_instance_id")
        )

    # Update members if provided
    if "member_ids" in data:
        await storage.set_complementary_group_members(group_id, data["member_ids"])

    updated = await storage.get_complementary_group(group_id)
    return updated


@router.delete("/complementary-groups/{group_id}")
async def delete_complementary_group(group_id: int):
    """Delete a complementary group."""
    storage = get_storage()

    existing = await storage.get_complementary_group(group_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    await storage.delete_complementary_group(group_id)
    return {"success": True, "message": "Group deleted"}


@router.post("/complementary-groups/{group_id}/members/{instance_id}")
async def add_member_to_group(group_id: int, instance_id: int):
    """Add an instance to a complementary group."""
    storage = get_storage()

    group = await storage.get_complementary_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    instance = await storage.get_jira_instance(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    added = await storage.add_instance_to_complementary_group(group_id, instance_id)
    if not added:
        raise HTTPException(status_code=400, detail="Instance already in group")

    return {"success": True, "message": "Instance added to group"}


@router.delete("/complementary-groups/{group_id}/members/{instance_id}")
async def remove_member_from_group(group_id: int, instance_id: int):
    """Remove an instance from a complementary group."""
    storage = get_storage()

    removed = await storage.remove_instance_from_complementary_group(group_id, instance_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Instance not in group")

    return {"success": True, "message": "Instance removed from group"}
