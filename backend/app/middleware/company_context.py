"""
Company Context Middleware - Inject company_id into request context from JWT.
"""
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from ..auth.jwt import verify_token


# Context variable to store company_id for the current request
company_id_var: ContextVar[int] = ContextVar('company_id', default=None)


class CompanyContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts company_id from JWT token and stores it in context.

    This allows company-scoped queries without passing company_id explicitly
    through every function call.
    """

    async def dispatch(self, request: Request, call_next):
        """Process request and inject company context."""
        # Extract Authorization header
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = verify_token(token)

            if payload and "company_id" in payload:
                # Set company_id in context for this request
                company_id_var.set(payload["company_id"])

        # Process request
        response = await call_next(request)

        # Clear context after request (automatically done by ContextVar scope)
        return response


def get_current_company_id() -> int | None:
    """
    Get the current company_id from context.

    Returns:
        Company ID if set in context, None otherwise
    """
    return company_id_var.get(None)
