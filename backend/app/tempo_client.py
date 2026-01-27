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
        Get worklogs within a date range, optionally filtered by user emails.
        
        Args:
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            user_emails: Optional list of user email addresses to filter by
            user_account_ids: Optional list of Atlassian account IDs to filter by
        """
        all_worklogs = []
        offset = 0
        limit = 1000  # Max per Tempo API
        
        print(f"Fetching Tempo worklogs for {start_date} to {end_date}...")
        
        # Convert emails to lowercase for comparison
        email_filter = [e.lower() for e in user_emails] if user_emails else None
        
        while True:
            try:
                params = {
                    "from": start_date.isoformat(),
                    "to": end_date.isoformat(),
                    "limit": limit,
                    "offset": offset
                }
                
                result = await self._request("GET", "/worklogs", params=params)
                
                worklogs_data = result.get("results", [])
                
                for wl in worklogs_data:
                    # Parse author info
                    author = wl.get("author", {})
                    author_account_id = author.get("accountId", "")
                    author_display_name = author.get("displayName", "")

                    # Map accountId to email using our mapping
                    author_email = self.account_id_to_email.get(author_account_id, "")

                    # Filter by account IDs if provided (only include configured users)
                    if user_account_ids and author_account_id not in user_account_ids:
                        continue
                    
                    # Parse dates
                    try:
                        # Tempo uses "startDate" as YYYY-MM-DD and "startTime" as HH:MM:SS
                        start_date_str = wl.get("startDate", "")
                        start_time_str = wl.get("startTime", "00:00:00")
                        if start_date_str:
                            started = datetime.fromisoformat(f"{start_date_str}T{start_time_str}")
                        else:
                            continue
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing Tempo worklog date: {e}")
                        continue
                    
                    # Get issue info
                    issue = wl.get("issue", {})
                    issue_key = issue.get("key", "")
                    issue_id = issue.get("id", "")
                    
                    # Note: Tempo doesn't include issue summary or epic directly
                    # We would need to fetch these from JIRA if needed
                    
                    worklog = Worklog(
                        id=f"{self.jira_instance_name}_tempo_{wl.get('tempoWorklogId', wl.get('jiraWorklogId', ''))}",
                        issue_key=issue_key or str(issue_id),
                        issue_summary="",  # Will need to fetch from JIRA if needed
                        author_email=author_email,
                        author_display_name=author_display_name,
                        time_spent_seconds=wl.get("timeSpentSeconds", 0),
                        started=started,
                        jira_instance=self.jira_instance_name,
                        epic_key=None,
                        epic_name=None
                    )
                    all_worklogs.append(worklog)
                
                print(f"  Fetched {len(worklogs_data)} worklogs (offset {offset})")
                
                # Check if there are more pages
                metadata = result.get("metadata", {})
                total_count = metadata.get("count", 0)
                
                if len(worklogs_data) < limit:
                    break
                
                offset += limit
                
                # Safety limit
                if offset > 50000:
                    print("Warning: Hit safety limit of 50,000 worklogs")
                    break
                    
            except httpx.HTTPError as e:
                print(f"Error fetching Tempo worklogs: {e}")
                break
        
        print(f"Total Tempo worklogs fetched: {len(all_worklogs)}")

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
