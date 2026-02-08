"""
Google OAuth Configuration - OAuth 2.0 client setup with authlib.
"""
from authlib.integrations.starlette_client import OAuth

from ..auth_config import auth_settings


# Initialize OAuth client
oauth = OAuth()

# Register Google OAuth provider
oauth.register(
    name='google',
    client_id=auth_settings.GOOGLE_CLIENT_ID,
    client_secret=auth_settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'select_account'  # Always show account picker
    }
)
