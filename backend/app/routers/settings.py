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
    """Import teams and users from config.yaml to database."""
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
    return ImportConfigResponse(**result)


@router.get("/jira-instances")
async def get_jira_instances(config: AppConfig = Depends(get_config)):
    """Get list of configured JIRA instances (names only, no credentials)."""
    return {
        "instances": [
            {"name": inst.name, "url": inst.url}
            for inst in config.jira_instances
        ]
    }
