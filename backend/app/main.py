"""
JIRA Worklog Dashboard - FastAPI Backend
Main application entry point.
"""
import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_config, DEMO_CONFIG, get_teams_from_db, get_users_from_db
from .cache import get_storage
from .routers import dashboard, teams, users, epics, sync, settings, logs, issues
from .logging_config import (
    setup_logging, generate_request_id, request_id_var,
    get_logger, get_db_handler
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - runs on startup and shutdown."""
    # Setup logging first
    setup_logging(log_level="DEBUG")
    logger = get_logger(__name__)

    # Startup
    logger.info("Starting JIRA Worklog Dashboard...")

    # Try to load config, fall back to demo mode if not found
    try:
        config = get_config()
        if config.settings.demo_mode:
            logger.info("Running in DEMO MODE with sample data")
        else:
            logger.info(f"Loaded configuration with {len(config.jira_instances)} JIRA instance(s)")
            logger.info(f"Configured {len(config.teams)} team(s) from config")
    except FileNotFoundError:
        logger.warning("No config.yaml found - running in DEMO MODE")
        # Force demo mode by setting environment variable
        os.environ["JIRA_DASHBOARD_DEMO_MODE"] = "true"

    # Initialize storage
    storage = get_storage()
    await storage.initialize()
    logger.info("Storage initialized")

    yield

    # Shutdown
    logger.info("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="JIRA Worklog Dashboard",
    description="Dashboard per visualizzare i worklog JIRA con supporto multi-team e multi-istanza",
    version="1.0.0",
    lifespan=lifespan
)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and responses."""

    async def dispatch(self, request: Request, call_next):
        # Generate and set request ID
        request_id = generate_request_id()
        request_id_var.set(request_id)

        # Skip logging for certain endpoints to reduce noise
        skip_logging = request.url.path in ["/api/health", "/api/logs"]

        start_time = time.time()
        logger = get_logger("http")

        # Log request (unless skipped)
        if not skip_logging:
            logger.info(f"Request: {request.method} {request.url.path}")

        # Process request
        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000

            # Log response
            if not skip_logging:
                logger.info(
                    f"Response: {request.method} {request.url.path} - {response.status_code} ({duration_ms:.1f}ms)"
                )

            # Flush logs to database
            db_handler = get_db_handler()
            if db_handler and not skip_logging:
                buffered_logs = db_handler.get_and_clear_buffer()
                if buffered_logs:
                    # Enrich with request info
                    for log in buffered_logs:
                        log["endpoint"] = request.url.path
                        log["method"] = request.method
                        log["status_code"] = response.status_code
                        log["duration_ms"] = duration_ms

                    # Store to database
                    storage = get_storage()
                    await storage.insert_logs_batch(buffered_logs)

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"Error: {request.method} {request.url.path} - {str(e)}", exc_info=True)
            raise


# Add logging middleware (before CORS)
app.add_middleware(LoggingMiddleware)

# Configure CORS for frontend (web and Tauri desktop)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "tauri://localhost",      # Tauri desktop app
        "https://tauri.localhost", # Tauri desktop app (alternative)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router)
app.include_router(teams.router)
app.include_router(users.router)
app.include_router(epics.router)
app.include_router(issues.router)
app.include_router(sync.router)
app.include_router(settings.router)
app.include_router(logs.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    try:
        config = get_config()
        teams = await get_teams_from_db()
        return {
            "status": "healthy",
            "demo_mode": config.settings.demo_mode,
            "jira_instances": len(config.jira_instances),
            "teams": len(teams)
        }
    except FileNotFoundError:
        return {
            "status": "healthy",
            "demo_mode": True,
            "jira_instances": 2,
            "teams": 3
        }


@app.get("/api/config")
async def get_config_info():
    """Get non-sensitive configuration info."""
    try:
        config = get_config()
    except FileNotFoundError:
        config = DEMO_CONFIG

    # Get teams and users from database
    teams = await get_teams_from_db()
    users = await get_users_from_db()

    # Group users by team
    team_members = {}
    for user in users:
        team_name = user.get("team_name")
        if team_name:
            if team_name not in team_members:
                team_members[team_name] = []
            team_members[team_name].append({
                "email": user["email"],
                "full_name": f"{user['first_name']} {user['last_name']}"
            })

    return {
        "demo_mode": config.settings.demo_mode,
        "daily_working_hours": config.settings.daily_working_hours,
        "timezone": config.settings.timezone,
        "complementary_instances": config.settings.complementary_instances,
        "jira_instances": [
            {"name": inst.name, "url": inst.url}
            for inst in config.jira_instances
        ],
        "teams": [
            {
                "name": team["name"],
                "member_count": len(team_members.get(team["name"], [])),
                "members": team_members.get(team["name"], [])
            }
            for team in teams
        ]
    }


@app.post("/api/cache/clear")
async def clear_cache():
    """Clear all cached data."""
    cache = get_cache()
    await cache.clear_all()
    return {"status": "ok", "message": "Cache cleared"}


# Entry point for running as standalone executable (Tauri sidecar)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
