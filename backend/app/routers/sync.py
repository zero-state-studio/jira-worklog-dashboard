"""
Sync API router - manual synchronization of worklogs from JIRA.
"""
import json
import asyncio
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..models import AppConfig
from ..config import get_config, get_users_from_db, get_jira_instances_from_db
from ..cache import get_storage
from ..auth.dependencies import require_admin, CurrentUser
from ..jira_client import JiraService
from ..demo_data import DemoJiraService

router = APIRouter(prefix="/api/sync", tags=["sync"])


class SyncRequest(BaseModel):
    """Request body for sync operation."""
    start_date: date
    end_date: date
    jira_instances: Optional[list[str]] = None  # None = all instances


class SyncResponse(BaseModel):
    """Response from sync operation."""
    success: bool
    sync_id: int
    worklogs_synced: int
    worklogs_updated: int
    worklogs_deleted: int
    message: str


class DataStatusResponse(BaseModel):
    """Response for data status."""
    total_worklogs: int
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    has_data: bool


def get_jira_service(config: AppConfig = Depends(get_config)):
    """Get the appropriate JIRA service based on config."""
    if config.settings.demo_mode:
        return DemoJiraService(config)
    return JiraService(config)


@router.post("", response_model=SyncResponse)
async def sync_worklogs(
    request: SyncRequest,
    current_user: CurrentUser = Depends(require_admin),
    config: AppConfig = Depends(get_config)
):
    """
    Manually sync worklogs from JIRA to local storage (ADMIN only).

    - start_date, end_date: Date range to sync
    - jira_instances: List of instance names to sync (None = all)
    """
    storage = get_storage()

    # Get JIRA instances from database (scoped to company)
    db_instances = await get_jira_instances_from_db(current_user.company_id)

    # Determine which instances to sync
    all_instance_names = [inst.name for inst in db_instances]
    if request.jira_instances:
        # Validate requested instances
        for name in request.jira_instances:
            if name not in all_instance_names:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown JIRA instance: {name}"
                )
        instances_to_sync = request.jira_instances
    else:
        instances_to_sync = all_instance_names
    
    # Start sync record
    sync_id = await storage.start_sync(
        current_user.company_id,
        request.start_date,
        request.end_date,
        instances_to_sync
    )
    
    try:
        # Get all configured users from database with their JIRA account mappings (scoped to company)
        users = await get_users_from_db(current_user.company_id)
        all_emails = [u["email"] for u in users]

        # Build mapping of accountId -> email and collect account IDs per instance
        account_id_to_email = {}  # accountId -> email
        instance_account_ids = {}  # instance_name -> [accountIds]

        for user in users:
            email = user["email"]
            for jira_account in user.get("jira_accounts", []):
                account_id = jira_account.get("account_id")
                instance = jira_account.get("jira_instance")
                if account_id and instance:
                    account_id_to_email[account_id] = email
                    if instance not in instance_account_ids:
                        instance_account_ids[instance] = []
                    instance_account_ids[instance].append(account_id)

        total_synced = 0
        total_updated = 0
        total_deleted = 0
        
        # Get JIRA service (real or demo)
        if config.settings.demo_mode:
            service = DemoJiraService(config)
        else:
            service = JiraService(config)
        
        # Sync each instance
        for instance_name in instances_to_sync:
            # Fetch worklogs from JIRA for this instance
            if config.settings.demo_mode:
                # Demo mode - generate worklogs
                worklogs = await service.get_all_worklogs(
                    request.start_date, 
                    request.end_date, 
                    all_emails
                )
                # Filter to this instance
                worklogs = [w for w in worklogs if w.jira_instance == instance_name]
            else:
                # Real mode - fetch from specific instance
                for inst_config in db_instances:
                    if inst_config.name == instance_name:
                        # Check if Tempo API token is configured
                        if inst_config.tempo_api_token:
                            # Use Tempo API (more efficient, filters by date range)
                            from ..tempo_client import TempoClient
                            from ..jira_client import JiraClient
                            print(f"Using Tempo API for {instance_name}")

                            # Get account IDs for this instance
                            user_account_ids = instance_account_ids.get(instance_name, [])
                            print(f"  Filtering for {len(user_account_ids)} user account IDs")

                            tempo_client = TempoClient(
                                tempo_api_token=inst_config.tempo_api_token,
                                jira_instance_name=inst_config.name,
                                jira_base_url=inst_config.url,
                                account_id_to_email=account_id_to_email
                            )
                            worklogs = await tempo_client.get_worklogs_in_range(
                                request.start_date,
                                request.end_date,
                                user_account_ids=user_account_ids if user_account_ids else None
                            )

                            # Enrich worklogs with JIRA issue details (key, summary, epic)
                            if worklogs:
                                # Collect issue IDs that need resolution (numeric IDs)
                                issue_ids_to_resolve = set()
                                for wl in worklogs:
                                    # If issue_key is numeric, it's actually an ID
                                    if wl.issue_key and wl.issue_key.isdigit():
                                        issue_ids_to_resolve.add(wl.issue_key)

                                if issue_ids_to_resolve:
                                    print(f"  Resolving {len(issue_ids_to_resolve)} issue IDs via JIRA API...")
                                    jira_client = JiraClient(inst_config)
                                    issue_details = await jira_client.get_issues_by_ids(list(issue_ids_to_resolve))

                                    # Recreate worklogs with resolved data
                                    from ..models import Worklog
                                    enriched_worklogs = []
                                    for wl in worklogs:
                                        if wl.issue_key in issue_details:
                                            details = issue_details[wl.issue_key]
                                            enriched_worklogs.append(Worklog(
                                                id=wl.id,
                                                issue_key=details.get("key") or wl.issue_key,
                                                issue_summary=details.get("summary") or "",
                                                author_email=wl.author_email,
                                                author_display_name=wl.author_display_name,
                                                time_spent_seconds=wl.time_spent_seconds,
                                                started=wl.started,
                                                jira_instance=wl.jira_instance,
                                                parent_key=details.get("parent_key"),
                                                parent_name=details.get("parent_name"),
                                                parent_type=details.get("parent_type"),
                                                epic_key=details.get("epic_key"),
                                                epic_name=details.get("epic_name")
                                            ))
                                        else:
                                            enriched_worklogs.append(wl)
                                    worklogs = enriched_worklogs
                        else:
                            # Fall back to JIRA API
                            from ..jira_client import JiraClient
                            print(f"Using JIRA API for {instance_name} (no Tempo token)")
                            client = JiraClient(inst_config)
                            # Use account IDs for filtering (more reliable than email)
                            user_account_ids = instance_account_ids.get(instance_name, [])
                            worklogs = await client.get_worklogs_in_range(
                                request.start_date,
                                request.end_date,
                                user_account_ids=user_account_ids if user_account_ids else None,
                                account_id_to_email=account_id_to_email
                            )
                        break
            
            # Upsert worklogs to storage
            inserted, updated = await storage.upsert_worklogs(worklogs, current_user.company_id)
            total_synced += inserted
            total_updated += updated
            
            # Delete worklogs not found in JIRA (removed from JIRA)
            worklog_ids = [w.id for w in worklogs]
            deleted = await storage.delete_worklogs_not_in_list(
                worklog_ids,
                request.start_date,
                request.end_date,
                instance_name,
                current_user.company_id
            )
            total_deleted += deleted
        
        # Complete sync record
        await storage.complete_sync(
            sync_id,
            current_user.company_id,
            total_synced,
            total_updated,
            total_deleted
        )
        
        return SyncResponse(
            success=True,
            sync_id=sync_id,
            worklogs_synced=total_synced,
            worklogs_updated=total_updated,
            worklogs_deleted=total_deleted,
            message=f"Sync completed: {total_synced} new, {total_updated} updated, {total_deleted} deleted"
        )
        
    except Exception as e:
        # Record sync failure
        await storage.complete_sync(sync_id, current_user.company_id, 0, 0, 0, error=str(e))
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/stream")
async def sync_worklogs_stream(
    request: SyncRequest,
    current_user: CurrentUser = Depends(require_admin),
    config: AppConfig = Depends(get_config)
):
    """
    Sync worklogs with real-time progress streaming via JSON lines (ADMIN only).
    Each line is a JSON object with a 'type' field indicating the event type.
    """

    async def generate_progress():
        storage = get_storage()

        # Get JIRA instances from database
        db_instances = await get_jira_instances_from_db(current_user.company_id)

        # Determine which instances to sync
        all_instance_names = [inst.name for inst in db_instances]
        if request.jira_instances:
            for name in request.jira_instances:
                if name not in all_instance_names:
                    yield json.dumps({"type": "error", "message": f"Istanza JIRA sconosciuta: {name}"}) + "\n"
                    return
            instances_to_sync = request.jira_instances
        else:
            instances_to_sync = all_instance_names

        total_instances = len(instances_to_sync)

        # Start sync record
        sync_id = await storage.start_sync(
            current_user.company_id,
            request.start_date,
            request.end_date,
            instances_to_sync
        )

        yield json.dumps({"type": "started", "sync_id": sync_id, "total_instances": total_instances}) + "\n"
        await asyncio.sleep(0)  # flush

        try:
            # Get all configured users
            users = await get_users_from_db(current_user.company_id)
            all_emails = [u["email"] for u in users]

            # Build mapping of accountId -> email and collect account IDs per instance
            account_id_to_email = {}
            instance_account_ids = {}

            for user in users:
                email = user["email"]
                for jira_account in user.get("jira_accounts", []):
                    account_id = jira_account.get("account_id")
                    instance = jira_account.get("jira_instance")
                    if account_id and instance:
                        account_id_to_email[account_id] = email
                        if instance not in instance_account_ids:
                            instance_account_ids[instance] = []
                        instance_account_ids[instance].append(account_id)

            total_synced = 0
            total_updated = 0
            total_deleted = 0

            # Get JIRA service (real or demo)
            if config.settings.demo_mode:
                service = DemoJiraService(config)
            else:
                service = JiraService(config)

            # Sync each instance
            for idx, instance_name in enumerate(instances_to_sync):
                base_percent = int((idx / total_instances) * 100)
                instance_percent_range = int(100 / total_instances)

                yield json.dumps({
                    "type": "instance_start",
                    "instance": instance_name,
                    "current": idx + 1,
                    "total": total_instances,
                    "percent": base_percent,
                    "message": f"Connessione a {instance_name}..."
                }) + "\n"
                await asyncio.sleep(0)

                worklogs = []

                # Fetch worklogs
                yield json.dumps({
                    "type": "fetching_worklogs",
                    "instance": instance_name,
                    "message": f"Scaricamento worklog da {instance_name}...",
                    "percent": base_percent + int(instance_percent_range * 0.1)
                }) + "\n"
                await asyncio.sleep(0)

                if config.settings.demo_mode:
                    worklogs = await service.get_all_worklogs(
                        request.start_date,
                        request.end_date,
                        all_emails
                    )
                    worklogs = [w for w in worklogs if w.jira_instance == instance_name]
                else:
                    for inst_config in db_instances:
                        if inst_config.name == instance_name:
                            if inst_config.tempo_api_token:
                                from ..tempo_client import TempoClient
                                from ..jira_client import JiraClient

                                user_account_ids = instance_account_ids.get(instance_name, [])

                                if not user_account_ids:
                                    yield json.dumps({
                                        "type": "warning",
                                        "instance": instance_name,
                                        "message": f"⚠️ Nessun account JIRA mappato per {instance_name}. Vai in Settings → Utenti e clicca 'Fetch Account JIRA'",
                                        "percent": base_percent + int(instance_percent_range * 0.15)
                                    }) + "\n"
                                else:
                                    yield json.dumps({
                                        "type": "fetching_worklogs",
                                        "instance": instance_name,
                                        "message": f"Scaricamento worklog via Tempo API per {len(user_account_ids)} utenti...",
                                        "percent": base_percent + int(instance_percent_range * 0.15)
                                    }) + "\n"
                                await asyncio.sleep(0)

                                tempo_client = TempoClient(
                                    tempo_api_token=inst_config.tempo_api_token,
                                    jira_instance_name=inst_config.name,
                                    jira_base_url=inst_config.url,
                                    account_id_to_email=account_id_to_email
                                )
                                worklogs = await tempo_client.get_worklogs_in_range(
                                    request.start_date,
                                    request.end_date,
                                    user_account_ids=user_account_ids if user_account_ids else None
                                )

                                yield json.dumps({
                                    "type": "worklogs_fetched",
                                    "instance": instance_name,
                                    "count": len(worklogs),
                                    "message": f"{len(worklogs)} worklog trovati",
                                    "percent": base_percent + int(instance_percent_range * 0.4)
                                }) + "\n"
                                await asyncio.sleep(0)

                                # Enrich worklogs with JIRA issue details
                                if worklogs:
                                    issue_ids_to_resolve = set()
                                    for wl in worklogs:
                                        if wl.issue_key and wl.issue_key.isdigit():
                                            issue_ids_to_resolve.add(wl.issue_key)

                                    if issue_ids_to_resolve:
                                        yield json.dumps({
                                            "type": "enriching",
                                            "instance": instance_name,
                                            "message": f"Arricchimento dati per {len(issue_ids_to_resolve)} issue...",
                                            "percent": base_percent + int(instance_percent_range * 0.5)
                                        }) + "\n"
                                        await asyncio.sleep(0)

                                        jira_client = JiraClient(inst_config)
                                        issue_details = await jira_client.get_issues_by_ids(list(issue_ids_to_resolve))

                                        from ..models import Worklog
                                        enriched_worklogs = []
                                        for wl in worklogs:
                                            if wl.issue_key in issue_details:
                                                details = issue_details[wl.issue_key]
                                                enriched_worklogs.append(Worklog(
                                                    id=wl.id,
                                                    issue_key=details.get("key") or wl.issue_key,
                                                    issue_summary=details.get("summary") or "",
                                                    author_email=wl.author_email,
                                                    author_display_name=wl.author_display_name,
                                                    time_spent_seconds=wl.time_spent_seconds,
                                                    started=wl.started,
                                                    jira_instance=wl.jira_instance,
                                                    parent_key=details.get("parent_key"),
                                                    parent_name=details.get("parent_name"),
                                                    parent_type=details.get("parent_type"),
                                                    epic_key=details.get("epic_key"),
                                                    epic_name=details.get("epic_name")
                                                ))
                                            else:
                                                enriched_worklogs.append(wl)
                                        worklogs = enriched_worklogs
                            else:
                                from ..jira_client import JiraClient
                                user_account_ids = instance_account_ids.get(instance_name, [])

                                if not user_account_ids:
                                    yield json.dumps({
                                        "type": "warning",
                                        "instance": instance_name,
                                        "message": f"⚠️ Nessun account JIRA mappato per {instance_name}. Vai in Settings → Utenti e clicca 'Fetch Account JIRA'",
                                        "percent": base_percent + int(instance_percent_range * 0.15)
                                    }) + "\n"
                                else:
                                    yield json.dumps({
                                        "type": "fetching_worklogs",
                                        "instance": instance_name,
                                        "message": f"Scaricamento worklog via JIRA API per {len(user_account_ids)} utenti...",
                                        "percent": base_percent + int(instance_percent_range * 0.15)
                                    }) + "\n"
                                await asyncio.sleep(0)

                                client = JiraClient(inst_config)
                                worklogs = await client.get_worklogs_in_range(
                                    request.start_date,
                                    request.end_date,
                                    user_account_ids=user_account_ids if user_account_ids else None,
                                    account_id_to_email=account_id_to_email
                                )

                                yield json.dumps({
                                    "type": "worklogs_fetched",
                                    "instance": instance_name,
                                    "count": len(worklogs),
                                    "message": f"{len(worklogs)} worklog trovati",
                                    "percent": base_percent + int(instance_percent_range * 0.5)
                                }) + "\n"
                                await asyncio.sleep(0)
                            break

                # Save worklogs
                yield json.dumps({
                    "type": "saving",
                    "instance": instance_name,
                    "message": f"Salvataggio di {len(worklogs)} worklog nel database...",
                    "percent": base_percent + int(instance_percent_range * 0.7)
                }) + "\n"
                await asyncio.sleep(0)

                inserted, updated = await storage.upsert_worklogs(worklogs, current_user.company_id)
                total_synced += inserted
                total_updated += updated

                # Delete removed worklogs
                worklog_ids = [w.id for w in worklogs]
                deleted = await storage.delete_worklogs_not_in_list(
                    worklog_ids,
                    request.start_date,
                    request.end_date,
                    instance_name,
                    current_user.company_id
                )
                total_deleted += deleted

                yield json.dumps({
                    "type": "instance_complete",
                    "instance": instance_name,
                    "synced": inserted,
                    "updated": updated,
                    "deleted": deleted,
                    "percent": base_percent + instance_percent_range,
                    "message": f"{instance_name}: {inserted} nuovi, {updated} aggiornati, {deleted} eliminati"
                }) + "\n"
                await asyncio.sleep(0)

            # Complete sync record
            await storage.complete_sync(
                sync_id,
                current_user.company_id,
                total_synced,
                total_updated,
                total_deleted
            )

            yield json.dumps({
                "type": "complete",
                "sync_id": sync_id,
                "worklogs_synced": total_synced,
                "worklogs_updated": total_updated,
                "worklogs_deleted": total_deleted,
                "message": f"Sincronizzazione completata: {total_synced} nuovi, {total_updated} aggiornati, {total_deleted} eliminati"
            }) + "\n"

        except Exception as e:
            await storage.complete_sync(sync_id, current_user.company_id, 0, 0, 0, error=str(e))
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(
        generate_progress(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/history")
async def get_sync_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin)
):
    """Get recent sync history (ADMIN only)."""
    storage = get_storage()
    history = await storage.get_sync_history(current_user.company_id, limit)
    return {"history": history}


@router.get("/status", response_model=DataStatusResponse)
async def get_data_status(current_user: CurrentUser = Depends(require_admin)):
    """Get status of locally stored data (ADMIN only, scoped to company)."""
    storage = get_storage()

    count = await storage.get_worklog_count(current_user.company_id)
    date_range = await storage.get_data_date_range(current_user.company_id)

    return DataStatusResponse(
        total_worklogs=count,
        date_range_start=date_range[0].isoformat() if date_range else None,
        date_range_end=date_range[1].isoformat() if date_range else None,
        has_data=count > 0
    )


@router.get("/defaults")
async def get_sync_defaults(
    current_user: CurrentUser = Depends(require_admin),
    config: AppConfig = Depends(get_config)
):
    """Get default values for sync UI (ADMIN only)."""
    from datetime import date

    today = date.today()
    start_of_month = today.replace(day=1)

    # Get instances from database only (no fallback to config.yaml)
    storage = get_storage()
    db_instances = await storage.get_all_jira_instances(current_user.company_id)

    available_instances = [
        {"name": inst["name"], "url": inst["url"]}
        for inst in db_instances if inst.get("is_active", True)
    ]

    return {
        "default_start_date": start_of_month.isoformat(),
        "default_end_date": today.isoformat(),
        "available_instances": available_instances
    }
