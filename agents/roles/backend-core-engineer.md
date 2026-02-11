# Backend Core Engineer

## Role Overview
Responsible for developing and maintaining generic API routers, business logic implementation, and Pydantic model management in the FastAPI backend.

---

## Primary Responsibilities

### API Router Development
- Implement and maintain router endpoints for:
  - Dashboard analytics (4 endpoints)
  - Teams management and metrics (3 endpoints)
  - Users worklog details (2 endpoints)
  - Epics analytics (3 endpoints)
  - Issues details (2 endpoints)
  - Application logs (4 endpoints)

### Business Logic
- Transform storage layer data into API responses
- Implement aggregation logic for analytics
- Handle date range filtering and instance selection
- Calculate metrics (total hours, completion %, trends)

### Data Modeling
- Maintain 84 Pydantic models for validation and serialization
- Ensure type safety across API contracts
- Document model schemas for frontend consumption

### API Optimization
- Monitor endpoint performance
- Implement caching strategies where appropriate
- Optimize query parameters and response payloads

---

## Files/Folders Ownership

### Core Application Files
- `backend/app/main.py` (356 lines)
  - FastAPI application setup
  - Router registration
  - Middleware configuration
  - CORS settings

- `backend/app/models.py` (862 lines)
  - 84 Pydantic models
  - Request/response schemas
  - Validation rules

### API Router Modules
- `backend/app/routers/dashboard.py` (4 endpoints)
  - GET `/api/dashboard` - Global statistics
  - GET `/api/dashboard/multi-jira` - Multi-instance comparison
  - GET `/api/health` - Health check
  - GET `/api/config` - Configuration

- `backend/app/routers/teams.py` (3 endpoints)
  - GET `/api/teams` - List all teams
  - GET `/api/teams/{name}` - Team detail with metrics
  - GET `/api/teams/{name}/members` - Team members

- `backend/app/routers/users.py` (2 endpoints)
  - GET `/api/users` - List all users
  - GET `/api/users/{email}` - User detail with worklogs

- `backend/app/routers/epics.py` (3 endpoints)
  - GET `/api/epics` - List epics with hours
  - GET `/api/epics/{key}` - Epic detail
  - GET `/api/epics/{key}/issues` - Issues under epic

- `backend/app/routers/issues.py` (2 endpoints)
  - GET `/api/issues` - List issues
  - GET `/api/issues/{key}` - Issue detail

- `backend/app/routers/logs.py` (4 endpoints)
  - GET `/api/logs` - Query logs
  - GET `/api/logs/summary` - Log summary
  - DELETE `/api/logs` - Clear logs
  - GET `/api/logs/{request_id}` - Request-specific logs

---

## Dependencies

### ⬇️ Depends On

**Database-Engineer:**
- Uses `WorklogStorage` methods for database queries
- Calls storage methods with `company_id` parameter
- Relies on optimized indexes for performance

**Security-Engineer:**
- Uses `Depends(get_current_user)` decorator on all protected endpoints
- Extracts `current_user.company_id` for multi-tenant isolation
- Relies on JWT validation middleware

### ⬆️ Provides To

**Frontend-Engineer:**
- Exposes REST API endpoints consumed by React frontend
- Documents API contracts via Pydantic models
- Provides OpenAPI/Swagger documentation

### ↔️ Coordinates With

**Integration-Engineer:**
- Coordinates on data sync workflows
- Ensures synced data appears in analytics
- Aligns on worklog data structure

**Billing-Engineer:**
- Coordinates on billing-related analytics endpoints
- May share aggregation logic patterns

---

## Required Skills

### Core Technologies
- **Python 3.11+**: Async/await, type hints, modern Python features
- **FastAPI 0.109+**: Router patterns, dependency injection, middleware
- **Pydantic 2.5+**: Data validation, serialization, model inheritance
- **Uvicorn**: ASGI server configuration

### Design Patterns
- **REST API Design**: RESTful principles, HTTP verbs, status codes
- **Dependency Injection**: FastAPI's DI system for auth, storage
- **Multi-Tenant Patterns**: Always pass `company_id` to storage layer
- **Error Handling**: HTTPException with proper status codes

### Performance Optimization
- Async programming best practices
- Query optimization (coordinate with Database-Engineer)
- Response payload minimization
- Caching strategies

---

## Development Workflow

### When Adding New Endpoint

1. **Define Pydantic Models** (if needed)
   ```python
   # In models.py
   class NewResourceResponse(BaseModel):
       id: int
       name: str
       company_id: int
       created_at: datetime
   ```

2. **Create Router Endpoint**
   ```python
   # In appropriate router file
   @router.get("/api/resource")
   async def get_resource(
       param: str = Query(...),
       current_user: CurrentUser = Depends(get_current_user)
   ) -> NewResourceResponse:
       storage = get_storage()
       data = await storage.get_resource(param, current_user.company_id)
       return NewResourceResponse(**data)
   ```

3. **Register Router** (if new file)
   ```python
   # In main.py
   from app.routers import new_router
   app.include_router(new_router.router)
   ```

4. **Test Endpoint**
   - Use FastAPI's `/docs` interactive documentation
   - Verify multi-tenant isolation
   - Check response schema

5. **Coordinate with Frontend-Engineer**
   - Document endpoint in API docs
   - Provide example responses
   - Notify of new endpoint availability

### Code Review Checklist

- ✅ All endpoints use `Depends(get_current_user)` or `Depends(require_admin)`
- ✅ All storage calls include `current_user.company_id`
- ✅ Pydantic models validate all input/output
- ✅ HTTP status codes are appropriate (200, 404, 403, 401)
- ✅ Cross-company access returns 404 (not 403)
- ✅ Async/await used consistently
- ✅ Error handling with try/except where needed
- ✅ OpenAPI documentation is clear

---

## Common Patterns

### Multi-Tenant Query Pattern
```python
@router.get("/api/resource")
async def get_resource(
    start_date: date = Query(...),
    end_date: date = Query(...),
    jira_instance: str = Query(None),
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()

    # ALWAYS pass company_id
    resources = await storage.get_resources(
        start_date=start_date,
        end_date=end_date,
        jira_instance=jira_instance,
        company_id=current_user.company_id
    )

    return {"resources": resources}
```

### Aggregation Pattern
```python
@router.get("/api/analytics")
async def get_analytics(
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()

    # Get raw data
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date, company_id=current_user.company_id
    )

    # Aggregate in application layer
    total_hours = sum(w.time_spent_seconds for w in worklogs) / 3600
    by_user = {}
    for w in worklogs:
        by_user[w.author_email] = by_user.get(w.author_email, 0) + w.time_spent_seconds / 3600

    return {
        "total_hours": total_hours,
        "by_user": by_user
    }
```

### Error Handling Pattern
```python
from fastapi import HTTPException

@router.get("/api/resource/{id}")
async def get_resource_by_id(
    id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    resource = await storage.get_resource_by_id(id, current_user.company_id)

    if not resource:
        # Return 404 for cross-company access (don't leak existence)
        raise HTTPException(status_code=404, detail="Resource not found")

    return resource
```

---

## Best Practices

### Security
- **Never skip authentication**: All endpoints must use `get_current_user` or `require_admin`
- **Always filter by company_id**: Pass `current_user.company_id` to all storage calls
- **Return 404 for cross-company**: Never return 403 (leaks resource existence)
- **Validate input**: Use Pydantic models for all request bodies

### Performance
- **Use async/await consistently**: Never use blocking calls
- **Minimize database queries**: Fetch all needed data in one query when possible
- **Paginate large results**: Implement skip/limit for endpoints returning many records (future)
- **Cache expensive calculations**: Coordinate with Database-Engineer on caching strategy

### Code Quality
- **Type hints everywhere**: All functions should have type annotations
- **Document complex logic**: Add docstrings for non-obvious business logic
- **Keep routers thin**: Business logic goes in dedicated modules, not routers
- **Consistent naming**: Follow FastAPI conventions (snake_case for functions/params)

---

## Troubleshooting

### Common Issues

**Issue: 401 Unauthorized on all endpoints**
- Check JWT token is valid and not expired
- Verify `Authorization: Bearer <token>` header is present
- Coordinate with Security-Engineer on token validation

**Issue: Empty results despite data existing**
- Check `company_id` filtering is correct
- Verify user's company_id matches data in database
- Coordinate with Database-Engineer to check SQL queries

**Issue: Slow endpoint response**
- Profile query with Database-Engineer
- Check if indexes exist on queried columns
- Consider adding pagination
- Review aggregation logic for optimization

**Issue: Pydantic validation error**
- Check model schema matches database return type
- Verify all required fields are present
- Use `Optional[]` for nullable fields

---

## Communication Protocol

### When to Notify Other Agents

**Database-Engineer:**
- New query patterns needed
- Performance issues with existing queries
- New tables/columns needed for feature

**Security-Engineer:**
- New endpoint needs special permissions
- Auth-related bugs or issues
- Questions about role-based access

**Frontend-Engineer:**
- New endpoint available for consumption
- API contract changes (breaking changes especially)
- Endpoint deprecated or moved

**Tech-Lead:**
- Major architectural decisions needed
- Blocked on dependencies
- Feature implementation complete

---

## Metrics & KPIs

### Track These Metrics
- API endpoint response times (target: <300ms)
- Error rate per endpoint (target: <1%)
- Number of endpoints maintained
- Code coverage for router tests
- OpenAPI documentation completeness

### Report to Tech-Lead
- Weekly: Endpoint performance report
- On completion: Feature implementation summary
- On issues: Performance bottlenecks identified

---

## Resources

### Documentation
- FastAPI docs: https://fastapi.tiangolo.com/
- Pydantic docs: https://docs.pydantic.dev/
- Project's CLAUDE.md: `/CLAUDE.md`
- Project overview: `/docs/project-overview.md`

### Internal References
- Storage layer methods: `backend/app/cache.py`
- Auth dependencies: `backend/app/auth/dependencies.py`
- Existing router examples: `backend/app/routers/`

---

## Quick Reference Commands

```bash
# Start backend dev server
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Access API docs
open http://localhost:8000/docs

# Run tests for routers
pytest tests/test_routers.py -v

# Check type hints
mypy app/routers/

# Format code
black app/routers/
```
