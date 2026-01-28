"""
Async JIRA API client for fetching worklogs and epics.
Supports multiple JIRA instances with Basic Auth.
"""
import httpx
from datetime import datetime, date
from typing import Optional
import asyncio
import base64

from .models import Worklog, Epic, Issue, JiraInstanceConfig, AppConfig
from .cache import get_cache


class JiraClient:
    """Async client for JIRA REST API."""
    
    def __init__(self, instance: JiraInstanceConfig):
        self.instance = instance
        self.base_url = instance.url.rstrip("/")
        
        # Prepare Basic Auth header
        credentials = f"{instance.email}:{instance.api_token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        self.headers = {
            "Authorization": f"Basic {encoded}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Make an authenticated request to JIRA API."""
        url = f"{self.base_url}/rest/api/3{endpoint}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method,
                url,
                headers=self.headers,
                **kwargs
            )
            response.raise_for_status()
            return response.json()

    async def test_connection(self) -> dict:
        """
        Test the connection to JIRA by getting current user info.
        Returns user info if successful, raises exception otherwise.
        """
        result = await self._request("GET", "/myself")
        return {
            "accountId": result.get("accountId"),
            "emailAddress": result.get("emailAddress"),
            "displayName": result.get("displayName")
        }

    async def search_user_by_email(self, email: str) -> Optional[str]:
        """
        Search for a JIRA user by email and return their accountId.
        Uses JIRA API: GET /rest/api/3/user/search?query={email}
        Returns the accountId if found, None otherwise.
        """
        try:
            result = await self._request(
                "GET",
                "/user/search",
                params={"query": email}
            )

            # Find exact match by email (case insensitive)
            for user in result:
                user_email = user.get("emailAddress", "")
                if user_email.lower() == email.lower():
                    return user.get("accountId")

            # If no exact match, return the first result if there's only one
            if len(result) == 1:
                return result[0].get("accountId")

            return None
        except httpx.HTTPError as e:
            print(f"Error searching user {email}: {e}")
            return None

    async def get_all_users(self) -> dict[str, str]:
        """
        Get all users from JIRA and return a map of accountId -> email.
        Useful for mapping Tempo worklogs which only have accountId.
        """
        user_map = {}
        start_at = 0
        max_results = 50
        
        print(f"Fetching users from {self.instance.name}...")
        
        while True:
            try:
                # Search for all users
                result = await self._request(
                    "GET",
                    "/users/search",
                    params={
                        "startAt": start_at,
                        "maxResults": max_results
                    }
                )
                
                if not result:
                    break
                    
                for user in result:
                    account_id = user.get("accountId")
                    email = user.get("emailAddress")
                    if account_id and email:
                        user_map[account_id] = email
                
                if len(result) < max_results:
                    break
                    
                start_at += max_results
                
            except httpx.HTTPError as e:
                print(f"Error fetching users: {e}")
                break
                
        print(f"Found {len(user_map)} users with emails")
        return user_map
    
    async def get_worklogs_for_issue(self, issue_key: str) -> list[dict]:
        """Get all worklogs for a specific issue."""
        try:
            result = await self._request("GET", f"/issue/{issue_key}/worklog")
            return result.get("worklogs", [])
        except httpx.HTTPError as e:
            print(f"Error fetching worklogs for {issue_key}: {e}")
            return []
    
    async def search_issues_with_worklogs(
        self, 
        start_date: date, 
        end_date: date,
        user_emails: Optional[list[str]] = None
    ) -> list[dict]:
        """Search for issues that have worklogs in the date range."""
        # JQL to find issues with worklogs in the date range
        jql = f'worklogDate >= "{start_date}" AND worklogDate <= "{end_date}"'
        
        if user_emails:
            # Filter by specific users
            authors = " OR ".join([f'worklogAuthor = "{email}"' for email in user_emails])
            jql = f"{jql} AND ({authors})"
        
        all_issues = []
        start_at = 0
        max_results = 100
        
        while True:
            try:
                result = await self._request(
                    "GET",
                    "/search",
                    params={
                        "jql": jql,
                        "startAt": start_at,
                        "maxResults": max_results,
                        "fields": "key,summary,parent,customfield_10014"  # customfield_10014 is often Epic Link
                    }
                )
                
                issues = result.get("issues", [])
                all_issues.extend(issues)
                
                if len(issues) < max_results:
                    break
                    
                start_at += max_results
                
            except httpx.HTTPError as e:
                print(f"Error searching issues: {e}")
                break
        
        return all_issues
    
    async def get_issue_details(self, issue_key: str) -> Optional[dict]:
        """Get details for a specific issue."""
        try:
            return await self._request(
                "GET",
                f"/issue/{issue_key}",
                params={"fields": "key,summary,issuetype,parent,customfield_10014"}
            )
        except httpx.HTTPError:
            return None

    async def get_issues_by_ids(self, issue_ids: list[str]) -> dict[str, dict]:
        """
        Get issue details for multiple issue IDs.
        Returns a dict mapping issue_id -> {key, summary, parent_key, parent_name, parent_type, epic_key, epic_name}
        """
        if not issue_ids:
            return {}

        result_map = {}
        unique_ids = list(set(issue_ids))

        print(f"Fetching details for {len(unique_ids)} issues from JIRA...")

        # Fetch each issue individually (JQL search by ID doesn't work in some JIRA versions)
        for issue_id in unique_ids:
            try:
                issue = await self._request(
                    "GET",
                    f"/issue/{issue_id}",
                    params={"fields": "key,summary,parent,issuetype,project,customfield_10014"}
                )

                fields = issue.get("fields", {})

                # Initialize parent and epic info
                parent_key = None
                parent_name = None
                parent_type = None
                epic_key = None
                epic_name = None

                # Check if issue has a direct parent (Sub-task, Story under Epic, etc.)
                parent = fields.get("parent", {})
                if parent and parent.get("key"):
                    parent_key = parent.get("key")
                    parent_name = parent.get("fields", {}).get("summary", "")
                    parent_type = parent.get("fields", {}).get("issuetype", {}).get("name", "")

                    # If parent is an Epic, also set epic info
                    if parent_type == "Epic":
                        epic_key = parent_key
                        epic_name = parent_name

                # Check epic link field (classic projects - customfield_10014)
                if not epic_key:
                    epic_link = fields.get("customfield_10014")
                    if epic_link:
                        epic_key = epic_link
                        # Note: epic_name not available from this field, would need another request

                # Fallback: use Project if no parent found
                if not parent_key:
                    project = fields.get("project", {})
                    if project:
                        parent_key = project.get("key")
                        parent_name = project.get("name")
                        parent_type = "Project"

                result_map[issue_id] = {
                    "key": issue.get("key"),
                    "summary": fields.get("summary", ""),
                    "parent_key": parent_key,
                    "parent_name": parent_name,
                    "parent_type": parent_type,
                    "epic_key": epic_key,
                    "epic_name": epic_name
                }

            except httpx.HTTPError as e:
                print(f"Error fetching issue {issue_id}: {e}")
                continue

        print(f"Resolved {len(result_map)} issues")
        return result_map
    
    async def get_epics(self, project_keys: Optional[list[str]] = None) -> list[Epic]:
        """Get all epics from the JIRA instance."""
        jql = 'issuetype = Epic'
        if project_keys:
            projects = " OR ".join([f'project = "{pk}"' for pk in project_keys])
            jql = f"{jql} AND ({projects})"
        
        all_epics = []
        start_at = 0
        max_results = 100
        
        while True:
            try:
                result = await self._request(
                    "GET",
                    "/search",
                    params={
                        "jql": jql,
                        "startAt": start_at,
                        "maxResults": max_results,
                        "fields": "key,summary,customfield_10011"  # Epic Name field
                    }
                )
                
                for issue in result.get("issues", []):
                    fields = issue.get("fields", {})
                    epic = Epic(
                        key=issue["key"],
                        name=fields.get("customfield_10011") or fields.get("summary", ""),
                        summary=fields.get("summary", ""),
                        jira_instance=self.instance.name
                    )
                    all_epics.append(epic)
                
                if len(result.get("issues", [])) < max_results:
                    break
                    
                start_at += max_results
                
            except httpx.HTTPError as e:
                print(f"Error fetching epics: {e}")
                break
        
        return all_epics
    
    async def get_worklogs_in_range(
        self,
        start_date: date,
        end_date: date,
        user_emails: Optional[list[str]] = None
    ) -> list[Worklog]:
        """
        Get all worklogs in a date range for specified users.
        Uses the worklog/updated endpoint to get worklog IDs updated since start_date,
        then fetches details with worklog/list.
        """
        # Convert start_date to Unix timestamp (milliseconds)
        start_timestamp = int(datetime.combine(start_date, datetime.min.time()).timestamp() * 1000)
        
        # Step 1: Get all worklog IDs updated since start_date
        all_worklog_ids = []
        since = start_timestamp
        
        print(f"Fetching worklogs from {self.instance.name} since {start_date}...")
        
        while True:
            try:
                result = await self._request(
                    "GET",
                    "/worklog/updated",
                    params={"since": since}
                )
                
                values = result.get("values", [])
                for item in values:
                    all_worklog_ids.append(item["worklogId"])
                
                # Check if there are more pages
                if result.get("lastPage", True):
                    break
                
                # Get the next page using the 'until' timestamp
                since = result.get("until", since)
                if not since or since == start_timestamp:
                    break
                    
            except httpx.HTTPError as e:
                print(f"Error fetching worklog IDs: {e}")
                break
        
        print(f"Found {len(all_worklog_ids)} worklog IDs")
        
        if not all_worklog_ids:
            return []
        
        # Step 2: Fetch worklog details in batches (max 1000 per request)
        all_worklogs = []
        batch_size = 1000
        
        for i in range(0, len(all_worklog_ids), batch_size):
            batch_ids = all_worklog_ids[i:i + batch_size]
            
            try:
                result = await self._request(
                    "POST",
                    "/worklog/list",
                    json={"ids": batch_ids}
                )
                
                for wl in result:
                    # Parse the worklog
                    try:
                        started = datetime.fromisoformat(wl["started"].replace("Z", "+00:00"))
                    except (KeyError, ValueError) as e:
                        print(f"Error parsing worklog date: {e}")
                        continue
                    
                    # Check if worklog is in our date range
                    if not (start_date <= started.date() <= end_date):
                        continue
                    
                    # Check if author is in our user list
                    author_email = wl.get("author", {}).get("emailAddress", "")
                    if user_emails and author_email.lower() not in [e.lower() for e in user_emails]:
                        continue
                    
                    # Get issue details for epic info
                    issue_id = wl.get("issueId")
                    issue_key = None
                    issue_summary = ""
                    epic_key = None
                    epic_name = None
                    
                    if issue_id:
                        # Try to get issue details
                        try:
                            issue_data = await self._request(
                                "GET",
                                f"/issue/{issue_id}",
                                params={"fields": "key,summary,parent,customfield_10014"}
                            )
                            issue_key = issue_data.get("key")
                            fields = issue_data.get("fields", {})
                            issue_summary = fields.get("summary", "")
                            
                            # Check parent for epic
                            parent = fields.get("parent", {})
                            if parent and parent.get("fields", {}).get("issuetype", {}).get("name") == "Epic":
                                epic_key = parent.get("key")
                                epic_name = parent.get("fields", {}).get("summary")
                            
                            # Check epic link field
                            if not epic_key:
                                epic_key = fields.get("customfield_10014")
                        except httpx.HTTPError:
                            issue_key = str(issue_id)
                    
                    worklog = Worklog(
                        id=f"{self.instance.name}_{wl['id']}",
                        issue_key=issue_key or str(issue_id),
                        issue_summary=issue_summary,
                        author_email=author_email,
                        author_display_name=wl.get("author", {}).get("displayName", ""),
                        time_spent_seconds=wl.get("timeSpentSeconds", 0),
                        started=started,
                        jira_instance=self.instance.name,
                        epic_key=epic_key,
                        epic_name=epic_name
                    )
                    all_worklogs.append(worklog)
                    
            except httpx.HTTPError as e:
                print(f"Error fetching worklog details: {e}")
        
        print(f"Processed {len(all_worklogs)} worklogs for users")
        return all_worklogs


class JiraService:
    """Service layer for aggregating data from multiple JIRA instances."""
    
    def __init__(self, config: AppConfig):
        self.config = config
        self.clients = [JiraClient(inst) for inst in config.jira_instances]
        self.cache = get_cache(config.settings.cache_ttl_seconds)
    
    async def get_all_worklogs(
        self,
        start_date: date,
        end_date: date,
        user_emails: Optional[list[str]] = None
    ) -> list[Worklog]:
        """Get worklogs from all configured JIRA instances."""
        # Check cache first
        cache_key = f"worklogs_{start_date}_{end_date}_{','.join(sorted(user_emails or []))}"
        cached = await self.cache.get_query_cache(cache_key)
        if cached:
            return [Worklog(**w) for w in cached]
        
        # Fetch from all instances in parallel
        tasks = [
            client.get_worklogs_in_range(start_date, end_date, user_emails)
            for client in self.clients
        ]
        results = await asyncio.gather(*tasks)
        
        # Combine results
        all_worklogs = []
        for worklogs in results:
            all_worklogs.extend(worklogs)
        
        # Cache the results
        await self.cache.set_query_cache(
            cache_key, 
            [w.model_dump(mode="json") for w in all_worklogs]
        )
        
        return all_worklogs
    
    async def get_all_epics(self) -> list[Epic]:
        """Get epics from all configured JIRA instances."""
        cache_key = "all_epics"
        cached = await self.cache.get_query_cache(cache_key)
        if cached:
            return [Epic(**e) for e in cached]
        
        tasks = [client.get_epics() for client in self.clients]
        results = await asyncio.gather(*tasks)
        
        all_epics = []
        for epics in results:
            all_epics.extend(epics)
        
        await self.cache.set_query_cache(
            cache_key,
            [e.model_dump(mode="json") for e in all_epics]
        )
        
        return all_epics
