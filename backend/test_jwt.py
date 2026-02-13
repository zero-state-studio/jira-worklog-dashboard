#!/usr/bin/env python3
"""Test script to verify JWT tokens include role_level."""
from jose import jwt
from app.auth.jwt import create_access_token, verify_token
from app.auth_config import auth_settings
from app.models import UserRole

def test_jwt_creation():
    """Test that JWT tokens include role_level field."""
    print("Testing JWT token creation with role_level...")

    # Test all roles
    test_cases = [
        ("DEV", 1),
        ("PM", 2),
        ("MANAGER", 3),
        ("ADMIN", 4),
    ]

    for role, expected_level in test_cases:
        print(f"\nTesting {role} role (expected level {expected_level}):")

        # Create token
        token = create_access_token(
            user_id=1,
            company_id=1,
            email=f"test_{role.lower()}@example.com",
            role=role,
            role_level=expected_level
        )
        print(f"  ✓ Token created")

        # Decode token
        payload = jwt.decode(
            token,
            auth_settings.JWT_SECRET_KEY,
            algorithms=[auth_settings.JWT_ALGORITHM]
        )

        # Verify payload
        assert payload["role"] == role, f"Role mismatch: {payload['role']} != {role}"
        print(f"  ✓ Role: {payload['role']}")

        assert payload["role_level"] == expected_level, f"Level mismatch: {payload.get('role_level')} != {expected_level}"
        print(f"  ✓ Role level: {payload['role_level']}")

        assert payload["sub"] == "1", "User ID mismatch"
        assert payload["company_id"] == 1, "Company ID mismatch"
        assert payload["email"] == f"test_{role.lower()}@example.com", "Email mismatch"
        print(f"  ✓ All claims correct")

    print("\n" + "="*50)
    print("✓ All JWT token tests passed!")
    print("="*50)

if __name__ == "__main__":
    test_jwt_creation()
