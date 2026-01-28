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
    ImportConfigResponse
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


# ========== JIRA Account Endpoints ==========

@router.post("/users/{user_id}/fetch-account/{jira_instance}", response_model=FetchAccountIdResponse)
async def fetch_jira_account_id(
    user_id: int,
    jira_instance: str,
    config: AppConfig = Depends(get_config)
):
    """Fetch and store JIRA accountId for a user from a specific instance."""
    storage = get_storage()

    # Get user
    user = await storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find JIRA instance config
    instance_config = None
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
    # Don't expose credentials in response
    return {
        "id": instance["id"],
        "name": instance["name"],
        "url": instance["url"],
        "is_active": instance["is_active"],
        "has_tempo": bool(instance.get("tempo_api_token"))
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
        "has_tempo": bool(updated.get("tempo_api_token"))
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
        return {"success": True, "message": "Connection successful", "user": result}
    except Exception as e:
        return {"success": False, "message": str(e)}


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
