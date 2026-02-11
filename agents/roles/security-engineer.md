# Security Engineer

## Role Overview
Responsible for authentication, authorization, multi-tenant security isolation, JWT token management, Google OAuth integration, and security testing across the entire application.

---

## Primary Responsibilities

### Authentication Systems
- Google OAuth 2.0 integration
- JWT token generation and validation (access + refresh tokens)
- Token refresh mechanism (15 min access, 7 day refresh)
- Session management and tracking
- User invitation system

### Authorization & Access Control
- Role-based access control (ADMIN, MANAGER, USER)
- Endpoint permission enforcement via FastAPI dependencies
- Multi-tenant data isolation (company_id filtering)
- Protected route implementation (frontend)
- Audit logging for security events

### Multi-Tenant Security
- Ensure all 96 router endpoints filter by company_id
- Verify all 74 storage methods accept company_id parameter
- Cross-company access prevention (return 404, not 403)
- Security test suite maintenance (20 test cases)

### Credential Management
- JIRA API token encryption (future enhancement)
- Tempo API token security
- Environment variable management
- Secrets rotation procedures

---

## Files/Folders Ownership

### Authentication Module
- `backend/app/auth/` (3 files)
  - `jwt.py` - JWT token creation and validation
  - `dependencies.py` (168 lines) - Auth middleware and decorators
  - `google_oauth.py` - Google OAuth 2.0 flow

### Middleware
- `backend/app/middleware/company_context.py` - Multi-tenant context management

### API Routers
- `backend/app/routers/auth.py` (11 endpoints)
  - OAuth login/callback
  - Token refresh
  - User profile management
  - Company management (admin only)

- `backend/app/routers/invitations.py` (3 endpoints)
  - Create invitation (admin)
  - List invitations
  - Accept invitation (public with token)

### Security Tests
- `backend/tests/test_multi_tenant.py` (20 security test cases)
  - Authentication tests
  - Authorization tests (role-based)
  - Multi-tenant isolation tests
  - Credential security tests
  - Cross-company access prevention

- `backend/tests/conftest.py` - Test fixtures and auth helpers

### Frontend Auth
- `frontend/src/components/ProtectedRoute.jsx` - Route guard
- `frontend/src/pages/Login.jsx` - OAuth login page
- `frontend/src/pages/Onboarding.jsx` - Company onboarding

---

## Security Architecture

### Authentication Flow

```
1. User clicks "Login with Google"
   ↓
2. Redirect to Google OAuth consent screen
   ↓
3. Google redirects to /api/auth/callback?code=...
   ↓
4. Backend exchanges code for Google user info
   ↓
5. Backend creates/updates user in oauth_users table
   ↓
6. Backend generates JWT tokens:
   - Access token (15 min expiry)
   - Refresh token (7 day expiry)
   ↓
7. Frontend stores tokens in localStorage
   ↓
8. All API requests include: Authorization: Bearer <access_token>
```

### Token Structure

**Access Token (JWT):**
```python
{
  "sub": "123",              # User ID
  "email": "user@company.com",
  "company_id": 1,           # Multi-tenant isolation
  "role": "ADMIN",           # ADMIN, MANAGER, USER
  "type": "access",
  "exp": 1234567890          # 15 minutes from issuance
}
```

**Refresh Token (JWT):**
```python
{
  "sub": "123",
  "type": "refresh",
  "exp": 1234567890          # 7 days from issuance
}
```

### Multi-Tenant Isolation Pattern

**CRITICAL: This pattern MUST be followed everywhere**

```python
# In dependencies.py
class CurrentUser:
    def __init__(self, id, company_id, email, role):
        self.id = id
        self.company_id = company_id  # CRITICAL for isolation
        self.email = email
        self.role = role

    def is_admin(self) -> bool:
        return self.role == "ADMIN"

    def is_manager(self) -> bool:
        return self.role in ["ADMIN", "MANAGER"]

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> CurrentUser:
    token = credentials.credentials

    # Validate JWT
    payload = jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=["HS256"]
    )

    # Fetch user from database
    user = await storage.get_user_by_id(payload["sub"])

    if not user:
        raise HTTPException(401, "Invalid token")

    return CurrentUser(
        id=user["id"],
        company_id=user["company_id"],
        email=user["email"],
        role=user["role"]
    )

def require_admin(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    if not current_user.is_admin():
        raise HTTPException(403, "Admin privileges required")
    return current_user

def require_manager(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    if not current_user.is_manager():
        raise HTTPException(403, "Manager privileges required")
    return current_user
```

---

## Dependencies

### ⬆️ Provides To

**Backend-Core-Engineer:**
- `Depends(get_current_user)` decorator for all protected endpoints
- `Depends(require_admin)` for admin-only endpoints
- `Depends(require_manager)` for manager-level endpoints
- CurrentUser object with company_id for multi-tenant filtering

**Frontend-Engineer:**
- OAuth login/callback endpoints
- Token refresh endpoints
- User profile endpoints
- Role-based UI rendering data

**Database-Engineer:**
- Auth audit log requirements
- Session management schema
- Multi-tenant company_id requirements

### ↔️ Coordinates With

**All Engineers:**
- Security reviews for new features
- Multi-tenant isolation verification
- Auth-related bug fixes

**Tech-Lead:**
- Security architecture decisions
- Credential encryption strategy
- Security incident response

---

## Required Skills

### Core Technologies
- **OAuth 2.0**: Authorization code flow, token exchange, scope management
- **JWT (JSON Web Tokens)**: Token structure, signing, validation, expiry
- **python-jose**: JWT library for Python
- **authlib**: OAuth client library
- **Cryptography**: Symmetric/asymmetric encryption (future: credential encryption)

### Security Knowledge
- **OWASP Top 10**: Common vulnerabilities and mitigation
- **Multi-Tenant Security**: Data isolation, tenant context, cross-tenant attacks
- **Authentication vs Authorization**: Different security concerns
- **Token Management**: Expiry, refresh, revocation strategies
- **API Security**: Rate limiting, CORS, CSRF protection

### Testing
- **pytest**: Security test authoring
- **FastAPI TestClient**: API testing with authentication
- **Security Testing**: Penetration testing, fuzzing, negative testing

---

## Development Workflow

### Adding Authentication to New Endpoint

```python
# TEMPLATE for all protected endpoints
@router.get("/api/new-resource")
async def get_new_resource(
    param: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> dict:
    storage = get_storage()

    # ALWAYS pass current_user.company_id
    resource = await storage.get_resource(
        param,
        company_id=current_user.company_id
    )

    if not resource:
        # Return 404 for cross-company access (don't leak existence)
        raise HTTPException(404, "Resource not found")

    return resource

# TEMPLATE for admin-only endpoints
@router.post("/api/admin-action")
async def admin_action(
    data: dict,
    admin: CurrentUser = Depends(require_admin)
) -> dict:
    # Admin-only logic
    # admin.company_id still available
    pass

# TEMPLATE for manager-level endpoints
@router.post("/api/manager-action")
async def manager_action(
    data: dict,
    manager: CurrentUser = Depends(require_manager)
) -> dict:
    # Manager/Admin logic
    pass
```

### Security Review Checklist

When reviewing code for security:

- ✅ **Authentication**: All endpoints use `Depends(get_current_user)` or public
- ✅ **Authorization**: Admin/Manager endpoints use `require_admin`/`require_manager`
- ✅ **Multi-tenant**: All storage calls include `current_user.company_id`
- ✅ **Error responses**: Cross-company returns 404 (not 403)
- ✅ **Input validation**: Pydantic models validate all input
- ✅ **SQL injection**: Parameterized queries only (no string interpolation)
- ✅ **XSS prevention**: Frontend sanitizes user input
- ✅ **CSRF**: State parameter in OAuth flow
- ✅ **Rate limiting**: Consider adding (currently missing - medium priority)
- ✅ **Audit logging**: Sensitive operations logged to auth_audit_log

---

## Common Security Patterns

### Multi-Tenant Query Protection

```python
# GOOD: Explicit company_id filtering
async def get_teams(self, company_id: int) -> list[dict]:
    if not company_id:
        raise ValueError("company_id required")

    async with aiosqlite.connect(self.db_path) as db:
        cursor = await db.execute(
            "SELECT * FROM teams WHERE company_id = ?",
            (company_id,)
        )
        return await cursor.fetchall()

# BAD: Missing company_id filter (data leakage!)
async def get_teams_BAD(self) -> list[dict]:
    async with aiosqlite.connect(self.db_path) as db:
        cursor = await db.execute("SELECT * FROM teams")
        return await cursor.fetchall()
```

### Cross-Company Access Prevention

```python
# GOOD: Return 404 for cross-company access
async def get_team_by_id(
    team_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    team = await storage.get_team(team_id, current_user.company_id)
    if not team:
        # Don't leak existence with 403
        raise HTTPException(404, "Team not found")
    return team

# BAD: Leaks resource existence with different error
async def get_team_by_id_BAD(team_id: int, current_user: CurrentUser):
    team = await storage.get_team_any_company(team_id)
    if team and team["company_id"] != current_user.company_id:
        raise HTTPException(403, "Access denied")  # Leaks existence!
    if not team:
        raise HTTPException(404, "Team not found")
    return team
```

### Token Refresh Pattern

```python
@router.post("/api/auth/refresh")
async def refresh_access_token(
    refresh_token: str = Body(..., embed=True)
) -> dict:
    try:
        # Validate refresh token
        payload = jwt.decode(
            refresh_token,
            JWT_REFRESH_SECRET_KEY,
            algorithms=["HS256"]
        )

        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")

        # Get user
        user = await storage.get_user_by_id(payload["sub"])
        if not user:
            raise HTTPException(401, "User not found")

        # Generate new access token (NOT refresh token)
        new_access_token = create_access_token(
            user_id=user["id"],
            email=user["email"],
            company_id=user["company_id"],
            role=user["role"]
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.JWTError:
        raise HTTPException(401, "Invalid refresh token")
```

### Audit Logging Pattern

```python
async def log_security_event(
    event_type: str,
    user_id: int,
    company_id: int,
    details: dict
):
    """Log security-relevant events to audit log"""
    await storage.insert_audit_log(
        event_type=event_type,
        user_id=user_id,
        company_id=company_id,
        details=json.dumps(details),
        ip_address=get_client_ip(),
        user_agent=get_user_agent(),
        timestamp=datetime.utcnow()
    )

# Usage in sensitive endpoints
@router.delete("/api/teams/{team_id}")
async def delete_team(
    team_id: int,
    admin: CurrentUser = Depends(require_admin)
):
    team = await storage.get_team(team_id, admin.company_id)
    if not team:
        raise HTTPException(404, "Team not found")

    await storage.delete_team(team_id, admin.company_id)

    # Audit log
    await log_security_event(
        "team_deleted",
        admin.id,
        admin.company_id,
        {"team_id": team_id, "team_name": team["name"]}
    )

    return {"status": "deleted"}
```

---

## Security Testing

### Test Suite Structure

**test_multi_tenant.py** covers:

1. **Authentication Tests** (5 tests)
   - No token → 401
   - Invalid token → 401
   - Valid token → 200
   - Expired token → 401
   - Malformed token → 401

2. **Authorization Tests** (3 tests)
   - USER role on admin endpoint → 403
   - MANAGER role on admin endpoint → 403
   - ADMIN role on admin endpoint → 200

3. **Multi-Tenant Isolation** (8 tests)
   - Company A cannot see Company B teams
   - Company A cannot see Company B users
   - Company A cannot see Company B worklogs
   - Company A cannot see Company B billing clients
   - Cross-company team access → 404
   - Cross-company user access → 404
   - Cross-company JIRA credentials filtered
   - Dashboard shows only company data

4. **End-to-End** (4 tests)
   - Complete user journey with auth
   - Token refresh flow
   - Session expiry and reauth
   - Invitation flow

### Running Security Tests

```bash
cd backend

# Run all security tests
pytest tests/test_multi_tenant.py -v

# Run specific test
pytest tests/test_multi_tenant.py::test_auth_invalid_token_returns_401 -v

# Run with coverage
pytest tests/test_multi_tenant.py --cov=app.auth --cov-report=html

# Run only authentication tests
pytest tests/test_multi_tenant.py -k "auth" -v

# Run only isolation tests
pytest tests/test_multi_tenant.py -k "isolation" -v
```

### Writing Security Tests

```python
@pytest.mark.asyncio
async def test_cross_company_access_returns_404():
    """Verify cross-company access returns 404, not 403"""
    # Create Company A team
    team_a = await storage.create_team("Team A", company_id=1)

    # Create Company B user (different company)
    user_b = await storage.create_user("user@b.com", company_id=2)
    token_b = create_access_token(
        user_id=user_b["id"],
        email=user_b["email"],
        company_id=2,
        role="USER"
    )

    # Try to access Company A team as Company B user
    response = client.get(
        f"/api/teams/{team_a['id']}",
        headers={"Authorization": f"Bearer {token_b}"}
    )

    # Should return 404 (not 403) to avoid leaking existence
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

---

## Known Security Issues

### High Priority

1. **Plaintext JIRA Credentials** (Medium Priority in project, High in security)
   - JIRA API tokens stored unencrypted in SQLite
   - **Impact**: Database breach exposes all JIRA credentials
   - **Mitigation**: Implement encryption at rest
   - **Solution**: Use `cryptography` library with key derivation
   ```python
   from cryptography.fernet import Fernet

   # Generate key (store in environment variable)
   key = Fernet.generate_key()
   cipher = Fernet(key)

   # Encrypt before storing
   encrypted_token = cipher.encrypt(api_token.encode())
   await storage.save_jira_instance(..., api_token=encrypted_token)

   # Decrypt when using
   decrypted_token = cipher.decrypt(encrypted_token).decode()
   ```

2. **No Rate Limiting** (Medium Priority)
   - API has no rate limiting
   - **Impact**: Vulnerable to brute force, DoS
   - **Solution**: Add slowapi middleware
   ```python
   from slowapi import Limiter, _rate_limit_exceeded_handler
   from slowapi.util import get_remote_address

   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

   @app.get("/api/resource")
   @limiter.limit("100/hour")
   async def resource(...):
       pass
   ```

3. **JWT Token Revocation** (Design Trade-off)
   - Cannot revoke JWT tokens before expiry
   - **Impact**: Compromised tokens valid for 15 min
   - **Mitigation**: Short expiry (15 min) + refresh tokens
   - **Future**: Add token blacklist in database

### Medium Priority

4. **CORS Configuration** (Check production config)
   - Ensure CORS only allows trusted origins
   - **Current**: Likely allows all origins in dev
   - **Production**: Restrict to frontend domain only

5. **Session Management** (No active session tracking)
   - No way to see active sessions or force logout
   - **Future**: Add session tracking table

6. **Audit Log Retention** (No retention policy)
   - Audit logs grow unbounded
   - **Future**: Implement retention policy (2 years?)

---

## Best Practices

### General Security
- **Principle of least privilege**: Users get minimum required access
- **Defense in depth**: Multiple security layers (auth, authorization, SQL filtering)
- **Fail securely**: Errors should not leak information
- **Audit everything**: Log all security-relevant operations

### Authentication
- **Never trust client**: Always validate tokens server-side
- **Short token expiry**: Access tokens expire in 15 minutes
- **Secure token storage**: Frontend uses localStorage (acceptable for this app)
- **HTTPS only**: Tokens should only be transmitted over HTTPS in production

### Authorization
- **Check permissions on every request**: Never cache permission checks
- **Deny by default**: Require explicit permission grants
- **Role hierarchy**: ADMIN > MANAGER > USER
- **Audit admin actions**: All admin operations logged

### Multi-Tenant
- **Explicit company_id**: Pass as parameter, never from global context
- **Filter everything**: All queries MUST include company_id
- **404 not 403**: Don't leak resource existence across companies
- **Test isolation**: Every new feature needs multi-tenant test

---

## Troubleshooting

### Common Issues

**Issue: "401 Unauthorized" on all requests**
- Check JWT_SECRET_KEY is set correctly
- Verify token is not expired (check exp claim)
- Ensure Authorization header format: `Bearer <token>`
- Check token in localStorage (frontend)

**Issue: "403 Forbidden" for admin endpoint**
- Verify user role in database (should be "ADMIN")
- Check role claim in JWT token
- Ensure endpoint uses `Depends(require_admin)`

**Issue: User sees data from other company**
- **CRITICAL SECURITY ISSUE**
- Check storage method includes company_id filter
- Verify router passes current_user.company_id
- Run multi-tenant test suite immediately

**Issue: Google OAuth callback fails**
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Verify redirect URI matches Google Console config
- Check state parameter validation

---

## Communication Protocol

### When to Notify Other Agents

**All Engineers:**
- Security vulnerability discovered (IMMEDIATE)
- New authentication requirement
- Breaking changes to auth flow

**Backend-Core-Engineer:**
- New auth decorator available
- Auth-related endpoint changes
- Permission requirements for new feature

**Frontend-Engineer:**
- OAuth flow changes
- Token refresh logic updates
- New role-based UI requirements

**Tech-Lead:**
- Security incident (immediate escalation)
- Major security architecture change proposed
- Credential encryption implementation planned

---

## Resources

### Documentation
- OAuth 2.0 RFC: https://datatracker.ietf.org/doc/html/rfc6749
- JWT RFC: https://datatracker.ietf.org/doc/html/rfc7519
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- python-jose docs: https://python-jose.readthedocs.io/
- authlib docs: https://docs.authlib.org/

### Internal References
- Project overview: `/docs/project-overview.md`
- Multi-tenant memory: `~/.claude/projects/.../memory/MEMORY.md`
- Test README: `/backend/tests/README.md`
- Auth implementation: `/backend/app/auth/`

---

## Quick Reference Commands

```bash
# Generate JWT secret
openssl rand -hex 32

# Run security tests
cd backend
pytest tests/test_multi_tenant.py -v

# Run specific security test
pytest tests/test_multi_tenant.py::test_auth_invalid_token_returns_401 -v

# Check test coverage
pytest tests/test_multi_tenant.py --cov=app.auth --cov-report=html

# Decode JWT token (debugging)
python -c "import jwt; print(jwt.decode('token', options={'verify_signature': False}))"

# Test OAuth flow (manual)
# 1. Visit http://localhost:8000/api/auth/login
# 2. Complete Google OAuth
# 3. Check callback for tokens
```
