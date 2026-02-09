"""
Tempo Timesheets API client for fetching worklogs.
More granular than JIRA's native worklog API - supports filtering by date range.
Docs: https://apidocs.tempo.io/
"""
import httpx
from datetime import datetime, date
from typing import Optional
import asyncio

from .models import Worklog, JiraInstanceConfig


class TempoClient:
    """Async client for Tempo Timesheets REST API v4."""

    def __init__(
        self,
        tempo_api_token: str,
        jira_instance_name: str,
        jira_base_url: str,
        account_id_to_email: dict[str, str] = None
    ):
        self.api_token = tempo_api_token
        self.jira_instance_name = jira_instance_name
        self.jira_base_url = jira_base_url.rstrip("/")
        self.base_url = "https://api.tempo.io/4"
        self.headers = {
            "Authorization": f"Bearer {tempo_api_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        # Mapping from Jira accountId to user email
        self.account_id_to_email = account_id_to_email or {}
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Make an authenticated request to Tempo API."""
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                method, 
                url, 
                headers=self.headers,
                **kwargs
            )
            response.raise_for_status()
            return response.json()
    
    async def get_worklogs_in_range(
        self,
        start_date: date,
        end_date: date,
        user_emails: Optional[list[str]] = None,
        user_account_ids: Optional[list[str]] = None
    ) -> list[Worklog]:
        """
        Get worklogs within a date range for specified users.
        
        Uses per-user endpoint for privacy and efficiency - only fetches
        worklogs for users that are configured in the system.
        
        Args:
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            user_emails: Deprecated, not used
            user_account_ids: List of Atlassian account IDs to fetch worklogs for
        """
        if not user_account_ids:
            print("No user account IDs provided - skipping worklog fetch (privacy protection)")
            return []
        
        print(f"Fetching Tempo worklogs for {start_date} to {end_date}...")
        print(f"  Fetching for {len(user_account_ids)} users using per-user endpoint")
        
        all_worklogs = []
        
        for account_id in user_account_ids:
            user_worklogs = await self._get_user_worklogs_internal(
                account_id, start_date, end_date
            )
            all_worklogs.extend(user_worklogs)
        
        print(f"Total Tempo worklogs fetched: {len(all_worklogs)}")
        return all_worklogs
    
    async def _get_user_worklogs_internal(
        self,
        account_id: str,
        start_date: date,
        end_date: date
    ) -> list[Worklog]:
        """Internal method to fetch worklogs for a single user."""
        all_worklogs = []
        offset = 0
        limit = 1000
        
        # Get email from mapping
        author_email = self.account_id_to_email.get(account_id, "")
        
        while True:
            try:
                params = {
                    "from": start_date.isoformat(),
                    "to": end_date.isoformat(),
                    "limit": limit,
                    "offset": offset
                }
                
                result = await self._request(
                    "GET", 
                    f"/worklogs/user/{account_id}",
                    params=params
                )
                
                worklogs_data = result.get("results", [])
                
                for wl in worklogs_data:
                    author = wl.get("author", {})
                    author_display_name = author.get("displayName", "")
                    
                    # Parse dates
                    try:
                        start_date_str = wl.get("startDate", "")
                        start_time_str = wl.get("startTime", "00:00:00")
                        if start_date_str:
                            started = datetime.fromisoformat(f"{start_date_str}T{start_time_str}")
                        else:
                            continue
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing Tempo worklog date: {e}")
                        continue
                    
                    issue = wl.get("issue", {})
                    issue_key = issue.get("key", "")
                    issue_id = issue.get("id", "")
                    
                    worklog = Worklog(
                        id=f"{self.jira_instance_name}_tempo_{wl.get('tempoWorklogId', wl.get('jiraWorklogId', ''))}",
                        issue_key=issue_key or str(issue_id),
                        issue_summary="",
                        author_email=author_email,
                        author_display_name=author_display_name,
                        time_spent_seconds=wl.get("timeSpentSeconds", 0),
                        started=started,
                        jira_instance=self.jira_instance_name,
                        epic_key=None,
                        epic_name=None
                    )
                    all_worklogs.append(worklog)
                
                if len(worklogs_data) < limit:
                    break
                
                offset += limit
                
                # Safety limit per user
                if offset > 10000:
                    print(f"Warning: Hit safety limit of 10,000 worklogs for user {account_id}")
                    break
                    
            except httpx.HTTPError as e:
                print(f"Error fetching worklogs for user {account_id}: {e}")
                break
        
        if all_worklogs:
            print(f"  User {account_id}: {len(all_worklogs)} worklogs")
        
        return all_worklogs
    
    async def get_user_worklogs(
        self,
        account_id: str,
        start_date: date,
        end_date: date
    ) -> list[Worklog]:
        """
        Get worklogs for a specific user by their Atlassian account ID.
        This is more efficient than fetching all and filtering.
        """
        all_worklogs = []
        offset = 0
        limit = 1000
        
        while True:
            try:
                params = {
                    "from": start_date.isoformat(),
                    "to": end_date.isoformat(),
                    "limit": limit,
                    "offset": offset
                }
                
                result = await self._request(
                    "GET", 
                    f"/worklogs/user/{account_id}",
                    params=params
                )
                
                worklogs_data = result.get("results", [])
                
                for wl in worklogs_data:
                    author = wl.get("author", {})
                    
                    # Parse dates
                    try:
                        start_date_str = wl.get("startDate", "")
                        start_time_str = wl.get("startTime", "00:00:00")
                        if start_date_str:
                            started = datetime.fromisoformat(f"{start_date_str}T{start_time_str}")
                        else:
                            continue
                    except (ValueError, TypeError):
                        continue
                    
                    issue = wl.get("issue", {})
                    
                    worklog = Worklog(
                        id=f"{self.jira_instance_name}_tempo_{wl.get('tempoWorklogId', '')}",
                        issue_key=issue.get("key", ""),
                        issue_summary="",
                        author_email="",
                        author_display_name=author.get("displayName", ""),
                        time_spent_seconds=wl.get("timeSpentSeconds", 0),
                        started=started,
                        jira_instance=self.jira_instance_name,
                        epic_key=None,
                        epic_name=None
                    )
                    all_worklogs.append(worklog)
                
                if len(worklogs_data) < limit:
                    break
                
                offset += limit
                
            except httpx.HTTPError as e:
                print(f"Error fetching user worklogs: {e}")
                break
        
        return all_worklogs
