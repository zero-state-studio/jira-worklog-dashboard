# Integration Engineer

## Role Overview
Responsible for all external API integrations including JIRA REST API v3, Tempo API v4, Factorial HR API, sync operations, and cross-instance package creation.

---

## Primary Responsibilities

### JIRA/Tempo Integration
- Maintain JIRA REST API v3 client
- Maintain Tempo API v4 client (preferred for worklog queries)
- Implement worklog synchronization logic
- Handle API rate limiting and error recovery
- Epic and issue hierarchy resolution

### Sync Operations
- Manual sync trigger implementation
- Sync history tracking
- Bulk worklog upsert operations
- Progress reporting during sync
- Clear cache functionality

### Factorial HR Integration
- Employee leave synchronization
- Employee ID mapping (JIRA ↔ Factorial)
- Leave type handling (full day, half day, multiple types)
- Expected hours calculation integration

### Package Creation
- Cross-instance issue creation
- Issue hierarchy creation (parent + children)
- Issue linking across instances
- Template-based issue generation

---

## Files/Folders Ownership

### API Clients
- `backend/app/jira_client.py`
  - JIRA REST API v3 implementation
  - Issue search with JQL
  - Worklog fetching (fallback when no Tempo)
  - Epic/parent hierarchy resolution
  - Project and issue type queries

- `backend/app/tempo_client.py`
  - Tempo API v4 implementation
  - Efficient date-range worklog queries
  - Preferred client when tempo_api_token available

### Sync Routers
- `backend/app/routers/sync.py` (5 endpoints)
  - POST `/api/sync` - Manual sync trigger
  - GET `/api/sync/history` - Sync history log
  - GET `/api/sync/status` - Current sync status
  - POST `/api/sync/clear-cache` - Clear all cached data
  - DELETE `/api/sync/worklogs` - Delete worklogs in date range

### Factorial Integration
- `backend/app/routers/factorial.py` (7 endpoints)
  - GET `/api/factorial/config` - Get Factorial config
  - POST `/api/factorial/config` - Set API key
  - GET `/api/factorial/leaves` - List absences
  - POST `/api/factorial/sync` - Sync leaves
  - POST `/api/factorial/fetch-employee/{user_id}` - Fetch employee ID
  - POST `/api/factorial/bulk-fetch` - Bulk fetch employee IDs
  - GET `/api/factorial/calendar` - Absence calendar

### Package Creation
- `backend/app/routers/packages.py` (9 endpoints)
  - POST `/api/packages/create` - Create package of issues
  - GET `/api/packages/history` - List created packages
  - GET `/api/packages/templates` - List templates
  - POST `/api/packages/templates` - Create template
  - PUT `/api/packages/templates/{id}` - Update template
  - DELETE `/api/packages/templates/{id}` - Delete template
  - GET `/api/packages/linked/{group_id}` - Get linked issues
  - GET `/api/packages/templates/{id}` - Template detail
  - POST `/api/packages/test-credentials` - Test JIRA credentials

---

## Integration Architecture

### JIRA vs Tempo API Decision Tree

```
Is tempo_api_token configured?
├─ YES: Use Tempo API v4
│   ├─ Efficient date-range queries
│   ├─ GET /worklogs?from=2024-01-01&to=2024-01-31
│   └─ Returns all worklogs in range directly
│
└─ NO: Use JIRA REST API v3 (fallback)
    ├─ Less efficient (2-step process)
    ├─ Step 1: Search issues with JQL
    │   └─ worklogDate >= 2024-01-01 AND worklogDate <= 2024-01-31
    ├─ Step 2: Fetch worklogs for each issue
    │   └─ GET /issue/{key}/worklog
    └─ Filter worklogs by date (client-side)
```

### Sync Flow

```
USER CLICKS "SYNC NOW"
    ↓
1. Get JIRA instances (filtered by company_id)
    ↓
2. For each instance:
    ├─ Determine if Tempo or JIRA API
    ├─ Fetch worklogs in date range
    ├─ Resolve epic/parent hierarchy
    ├─ Denormalize data for storage
    └─ Bulk upsert to database
    ↓
3. Record sync in sync_history table
    ↓
4. Return success with stats
```

---

## Dependencies

### ⬇️ Depends On

**Database-Engineer:**
- Uses storage layer for bulk worklog upsert
- Sync history recording
- Factorial leaves storage
- Package history storage

**Security-Engineer:**
- Uses company_id for credential filtering
- JIRA API tokens scoped per company
- Tempo API tokens scoped per company

### ⬆️ Provides To

**Backend-Core-Engineer:**
- Synced worklog data for analytics
- Fresh data from JIRA/Tempo
- Factorial leave data for expected hours

**Frontend-Engineer:**
- Sync status updates
- Progress reporting during sync
- Error messages from external APIs

### ↔️ Coordinates With

**Tech-Lead:**
- API client architecture decisions
- Error handling strategies
- Rate limiting compliance

---

## Required Skills

### Core Technologies
- **httpx**: Async HTTP client for Python
- **JIRA REST API v3**: Endpoint structure, JQL, authentication
- **Tempo API v4**: Worklog endpoints, authentication
- **Factorial API**: Employee and leave endpoints
- **OAuth/API Keys**: Different auth mechanisms per API

### API Integration Patterns
- Async API calls with httpx
- Error handling and retry logic
- Rate limiting compliance
- Pagination handling
- Bulk data processing

### Data Transformation
- JSON parsing and transformation
- Denormalization for storage
- Hierarchy resolution (Epic → Story → Task)
- Date/time handling across timezones

---

## Development Workflow

### Adding New JIRA API Call

1. **Implement in JiraClient**
   ```python
   # In jira_client.py
   class JiraClient:
       def __init__(self, instance: JiraInstance):
           self.base_url = instance.url
           self.auth = (instance.email, instance.api_token)
           self.headers = {
               "Accept": "application/json",
               "Content-Type": "application/json"
           }

       async def get_projects(self) -> list[dict]:
           """Fetch all projects from JIRA instance"""
           async with httpx.AsyncClient() as client:
               response = await client.get(
                   f"{self.base_url}/rest/api/3/project",
                   auth=self.auth,
                   headers=self.headers,
                   timeout=30.0
               )
               response.raise_for_status()
               return response.json()
   ```

2. **Add Error Handling**
   ```python
   async def get_projects(self) -> list[dict]:
       try:
           async with httpx.AsyncClient() as client:
               response = await client.get(...)

               if response.status_code == 401:
                   raise APIAuthError("Invalid JIRA credentials")
               if response.status_code == 404:
                   raise APINotFoundError("JIRA instance not found")
               if response.status_code == 429:
                   raise APIRateLimitError("JIRA rate limit exceeded")

               response.raise_for_status()
               return response.json()

       except httpx.TimeoutException:
           raise APITimeoutError("JIRA request timed out")
       except httpx.RequestError as e:
           raise APIConnectionError(f"Failed to connect to JIRA: {str(e)}")
   ```

3. **Add to Router Endpoint**
   ```python
   # In appropriate router
   @router.get("/api/jira-instances/{id}/projects")
   async def get_jira_projects(
       id: int,
       current_user: CurrentUser = Depends(get_current_user)
   ):
       storage = get_storage()
       instance = await storage.get_jira_instance(id, current_user.company_id)

       if not instance:
           raise HTTPException(404, "JIRA instance not found")

       client = JiraClient(instance)
       projects = await client.get_projects()

       return {"projects": projects}
   ```

4. **Test Integration**
   - Test with real JIRA instance (or mock)
   - Verify error handling
   - Check performance
   - Test rate limiting behavior

---

## Common Patterns

### Worklog Sync Pattern (Tempo)

```python
async def sync_worklogs_tempo(
    instance: JiraInstance,
    start_date: date,
    end_date: date,
    company_id: int
) -> dict:
    """Sync worklogs using Tempo API"""

    client = TempoClient(instance.tempo_api_token)

    # Fetch worklogs from Tempo
    tempo_worklogs = await client.get_worklogs_in_range(
        start_date, end_date
    )

    # Transform to our format
    worklogs = []
    for tw in tempo_worklogs:
        # Resolve epic/parent hierarchy
        issue = await jira_client.get_issue(tw['issue']['key'])
        epic_key, epic_name = extract_epic_from_issue(issue)
        parent_key, parent_name = extract_parent_from_issue(issue)

        worklog = {
            'id': f"{instance.name}_{tw['tempoWorklogId']}",
            'company_id': company_id,
            'jira_instance': instance.name,
            'issue_key': tw['issue']['key'],
            'issue_summary': issue['fields']['summary'],
            'author_email': tw['author']['email'],
            'author_display_name': tw['author']['displayName'],
            'time_spent_seconds': tw['timeSpentSeconds'],
            'started': tw['startDate'] + 'T' + tw['startTime'],
            'epic_key': epic_key,
            'epic_name': epic_name,
            'parent_key': parent_key,
            'parent_name': parent_name,
            'data': json.dumps(tw)  # Store full payload
        }
        worklogs.append(worklog)

    # Bulk upsert to database
    storage = get_storage()
    await storage.upsert_worklogs(worklogs)

    return {
        'instance': instance.name,
        'worklogs_synced': len(worklogs),
        'start_date': str(start_date),
        'end_date': str(end_date)
    }
```

### Epic Hierarchy Resolution

```python
async def extract_epic_from_issue(
    issue: dict,
    jira_client: JiraClient
) -> tuple[str, str]:
    """
    Walk up issue hierarchy to find Epic.
    Returns (epic_key, epic_name) or (None, None).
    """

    # 1. Check if issue itself is Epic
    if issue['fields']['issuetype']['name'] == 'Epic':
        return issue['key'], issue['fields']['summary']

    # 2. Check Epic Link field (JIRA Cloud)
    epic_link_field = 'customfield_10014'  # Common, but varies
    if epic_key := issue['fields'].get(epic_link_field):
        epic = await jira_client.get_issue(epic_key)
        return epic['key'], epic['fields']['summary']

    # 3. Check parent field recursively (JIRA Server/DC)
    parent = issue['fields'].get('parent')
    if parent:
        if parent['fields']['issuetype']['name'] == 'Epic':
            return parent['key'], parent['fields']['summary']
        # Recurse upward
        parent_issue = await jira_client.get_issue(parent['key'])
        return await extract_epic_from_issue(parent_issue, jira_client)

    # No epic found
    return None, None
```

### Factorial Leave Sync Pattern

```python
async def sync_factorial_leaves(
    start_date: date,
    end_date: date,
    company_id: int
) -> dict:
    """Sync employee leaves from Factorial API"""

    # Get Factorial config
    config = await storage.get_factorial_config(company_id)
    if not config or not config.api_key:
        raise ValueError("Factorial API key not configured")

    # Get all users with Factorial employee IDs
    users = await storage.get_users_with_factorial_id(company_id)

    client = FactorialClient(config.api_key)
    total_leaves = 0

    for user in users:
        # Fetch leaves for employee
        leaves = await client.get_leaves(
            employee_id=user['factorial_employee_id'],
            start_date=start_date,
            end_date=end_date
        )

        # Transform and store
        for leave in leaves:
            await storage.upsert_factorial_leave({
                'company_id': company_id,
                'user_id': user['id'],
                'employee_id': user['factorial_employee_id'],
                'leave_type': leave['leave_type'],
                'start_date': leave['start_date'],
                'finish_date': leave['finish_date'],
                'half_day': leave.get('half_day'),  # 'start', 'finish', or None
                'data': json.dumps(leave)
            })
            total_leaves += 1

    return {
        'users_processed': len(users),
        'leaves_synced': total_leaves
    }
```

### Package Creation Pattern

```python
async def create_package(
    template_id: int,
    parent_summary: str,
    instance_configs: list[dict],
    company_id: int
) -> dict:
    """
    Create package of issues across multiple JIRA instances.

    instance_configs = [
        {
            'instance_name': 'Dev JIRA',
            'project_key': 'DEV',
            'selected_elements': ['Setup', 'Testing']
        },
        ...
    ]
    """

    template = await storage.get_package_template(template_id, company_id)
    results = []

    for config in instance_configs:
        # Get JIRA instance
        instance = await storage.get_jira_instance_by_name(
            config['instance_name'], company_id
        )

        client = JiraClient(instance)

        # Create parent issue
        parent_key = await client.create_issue(
            project=config['project_key'],
            issue_type=template.parent_issue_type,
            summary=parent_summary,
            description=template.parent_description
        )

        # Create child issues
        children = []
        for element in config['selected_elements']:
            child_key = await client.create_issue(
                project=config['project_key'],
                issue_type=template.child_issue_type,
                summary=element,
                parent=parent_key
            )
            children.append({
                'key': child_key,
                'element': element
            })

        results.append({
            'jira_instance': config['instance_name'],
            'parent_key': parent_key,
            'children': children
        })

        # Store package history
        await storage.save_package({
            'company_id': company_id,
            'template_id': template_id,
            'jira_instance': config['instance_name'],
            'parent_key': parent_key,
            'children_count': len(children),
            'created_at': datetime.utcnow()
        })

    return {
        'success': True,
        'results': results
    }
```

---

## API Error Handling

### JIRA API Errors

```python
class JiraAPIError(Exception):
    """Base exception for JIRA API errors"""
    pass

class JiraAuthError(JiraAPIError):
    """Authentication failed (401)"""
    pass

class JiraRateLimitError(JiraAPIError):
    """Rate limit exceeded (429)"""
    pass

class JiraNotFoundError(JiraAPIError):
    """Resource not found (404)"""
    pass

# Usage in client
async def get_issue(self, issue_key: str) -> dict:
    try:
        response = await self.client.get(
            f"{self.base_url}/rest/api/3/issue/{issue_key}"
        )

        if response.status_code == 401:
            raise JiraAuthError("Invalid credentials")
        if response.status_code == 404:
            raise JiraNotFoundError(f"Issue {issue_key} not found")
        if response.status_code == 429:
            # Extract retry-after header
            retry_after = int(response.headers.get('Retry-After', 60))
            raise JiraRateLimitError(f"Rate limit exceeded. Retry after {retry_after}s")

        response.raise_for_status()
        return response.json()

    except httpx.TimeoutException:
        raise JiraAPIError("Request timed out")
    except httpx.RequestError as e:
        raise JiraAPIError(f"Connection error: {str(e)}")
```

### Retry Logic with Backoff

```python
import asyncio
from functools import wraps

def retry_on_rate_limit(max_retries=3):
    """Decorator to retry API calls on rate limit"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except JiraRateLimitError as e:
                    if attempt == max_retries - 1:
                        raise  # Last attempt, give up
                    # Exponential backoff
                    wait_time = 2 ** attempt
                    print(f"Rate limited. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
            return None
        return wrapper
    return decorator

# Usage
@retry_on_rate_limit(max_retries=3)
async def get_issue(self, issue_key: str) -> dict:
    # ... API call
    pass
```

---

## Rate Limiting Compliance

### JIRA Cloud Rate Limits
- **Standard**: 10 requests per second per instance
- **Exponential backoff**: On 429, wait time doubles each retry
- **Batch operations**: Use bulk endpoints when available

### Tempo Rate Limits
- **Standard**: 100 requests per minute
- **Monitor**: Check X-RateLimit-Remaining header
- **Throttle**: Add delays between requests if approaching limit

### Implementation

```python
class RateLimiter:
    def __init__(self, requests_per_second: int):
        self.rate = requests_per_second
        self.last_request = 0

    async def wait(self):
        """Wait if necessary to respect rate limit"""
        now = time.time()
        time_since_last = now - self.last_request
        min_interval = 1.0 / self.rate

        if time_since_last < min_interval:
            wait_time = min_interval - time_since_last
            await asyncio.sleep(wait_time)

        self.last_request = time.time()

# Usage in client
class JiraClient:
    def __init__(self, instance: JiraInstance):
        # ... existing init
        self.rate_limiter = RateLimiter(requests_per_second=10)

    async def get_issue(self, issue_key: str) -> dict:
        await self.rate_limiter.wait()
        # ... make API call
```

---

## Testing External Integrations

### Mocking API Responses

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_sync_worklogs_tempo():
    """Test worklog sync with mocked Tempo API"""

    # Mock Tempo API response
    mock_tempo_response = [
        {
            'tempoWorklogId': 12345,
            'issue': {'key': 'PROJ-123'},
            'author': {
                'email': 'user@company.com',
                'displayName': 'User Name'
            },
            'timeSpentSeconds': 7200,
            'startDate': '2024-01-15',
            'startTime': '09:00:00'
        }
    ]

    with patch('app.tempo_client.TempoClient.get_worklogs_in_range') as mock_get:
        mock_get.return_value = mock_tempo_response

        # Run sync
        result = await sync_worklogs_tempo(
            instance=test_instance,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            company_id=1
        )

        # Verify
        assert result['worklogs_synced'] == 1
        assert mock_get.called
```

### Integration Tests (with Real API)

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_jira_client_real_api():
    """Integration test with real JIRA instance (requires credentials)"""

    instance = JiraInstance(
        name="Test Instance",
        url=os.getenv("TEST_JIRA_URL"),
        email=os.getenv("TEST_JIRA_EMAIL"),
        api_token=os.getenv("TEST_JIRA_API_TOKEN")
    )

    client = JiraClient(instance)

    # Fetch projects
    projects = await client.get_projects()
    assert len(projects) > 0
    assert 'key' in projects[0]
    assert 'name' in projects[0]
```

---

## Monitoring & Metrics

### Track These Metrics
- Sync duration by instance (target: <1 minute for 1K worklogs)
- API error rate per instance (target: <1%)
- Rate limit hits per day (target: 0)
- Worklogs synced per sync operation
- Failed sync operations (investigate > 5%)

### Logging

```python
import logging

logger = logging.getLogger(__name__)

async def sync_worklogs(instance, start_date, end_date, company_id):
    logger.info(
        f"Starting sync for {instance.name}",
        extra={
            'company_id': company_id,
            'instance': instance.name,
            'start_date': str(start_date),
            'end_date': str(end_date)
        }
    )

    try:
        result = await _do_sync(...)

        logger.info(
            f"Sync completed for {instance.name}",
            extra={
                'company_id': company_id,
                'worklogs_synced': result['count'],
                'duration_seconds': result['duration']
            }
        )

        return result

    except Exception as e:
        logger.error(
            f"Sync failed for {instance.name}",
            extra={
                'company_id': company_id,
                'error': str(e)
            },
            exc_info=True
        )
        raise
```

---

## Troubleshooting

### Common Issues

**Issue: "401 Unauthorized" from JIRA**
- Check API token is correct and not expired
- Verify email matches the token owner
- Ensure JIRA instance URL is correct (no trailing slash)
- Test credentials with curl or Postman

**Issue: "429 Rate Limit Exceeded"**
- Implement exponential backoff (already in retry logic)
- Reduce sync frequency
- Use batch endpoints where possible
- Consider upgrading JIRA plan for higher limits

**Issue: Sync takes too long (>5 minutes)**
- Check date range (narrow it down)
- Use Tempo API instead of JIRA (more efficient)
- Implement parallel syncing for multiple instances
- Add progress reporting for user feedback

**Issue: Epic/parent not resolved correctly**
- Check custom field IDs (varies by JIRA instance)
- Verify issue hierarchy is correct in JIRA
- Add logging to epic resolution logic
- Test with different issue types

**Issue: Factorial leaves not syncing**
- Verify Factorial API key is valid
- Check user has factorial_employee_id set
- Ensure date range includes leave dates
- Check Factorial API rate limits

---

## Communication Protocol

### When to Notify Other Agents

**Database-Engineer:**
- Bulk upsert performance issues
- New tables needed for integration data
- Index optimization for sync queries

**Backend-Core-Engineer:**
- New data available after sync
- Sync status endpoints changes
- Integration errors affecting analytics

**Frontend-Engineer:**
- Sync progress reporting updates
- New sync options available
- Error message format changes

**Tech-Lead:**
- External API issues (JIRA/Tempo/Factorial down)
- Rate limiting becoming problematic
- New integration requirements

---

## Resources

### External API Documentation
- JIRA REST API v3: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- Tempo API v4: https://apidocs.tempo.io/
- Factorial API: https://apidocs.factorialhr.com/

### Internal References
- Project overview: `/docs/project-overview.md`
- JIRA client: `/backend/app/jira_client.py`
- Tempo client: `/backend/app/tempo_client.py`

---

## Quick Reference Commands

```bash
# Test JIRA API manually
curl -u "email@example.com:api_token" \
  https://your-domain.atlassian.net/rest/api/3/project

# Test Tempo API manually
curl -H "Authorization: Bearer tempo_token" \
  https://api.tempo.io/4/worklogs?from=2024-01-01&to=2024-01-31

# Run integration tests
cd backend
pytest tests/test_integrations.py -v -m integration

# Trigger manual sync (via API)
curl -X POST http://localhost:8000/api/sync \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2024-01-01", "end_date": "2024-01-31"}'
```
