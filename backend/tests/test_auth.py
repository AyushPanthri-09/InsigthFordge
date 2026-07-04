from fastapi.testclient import TestClient
from backend.app import app
import pytest

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    """
    Cleans database tables before running each auth test to prevent cross-contamination.
    """
    from backend.core.database import SessionLocal, engine, Base
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_auth_registration_success() -> None:
    """
    Test successful user registration.
    """
    response = client.post(
        "/auth/register",
        json={"email": "new_analyst@insightforge.ai", "password": "securepassword123", "role": "Analyst"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new_analyst@insightforge.ai"
    assert data["role"] == "Analyst"
    assert data["is_active"] is True
    assert "id" in data

def test_auth_registration_duplicate_email() -> None:
    """
    Test that registering with duplicate email raises 400 Bad Request.
    """
    # First signup
    client.post(
        "/auth/register",
        json={"email": "duplicate@insightforge.ai", "password": "securepassword123"}
    )
    # Second signup
    response = client.post(
        "/auth/register",
        json={"email": "duplicate@insightforge.ai", "password": "anotherpassword321"}
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_auth_login_success() -> None:
    """
    Test successful login and token retrieval.
    """
    # Setup test user
    client.post(
        "/auth/register",
        json={"email": "login_test@insightforge.ai", "password": "securepassword123", "role": "Manager"}
    )
    
    response = client.post(
        "/auth/login",
        json={"email": "login_test@insightforge.ai", "password": "securepassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "Manager"

def test_auth_get_profile() -> None:
    """
    Test fetching authenticated user profile metadata.
    """
    # Setup user and login
    client.post(
        "/auth/register",
        json={"email": "profile_test@insightforge.ai", "password": "securepassword123", "role": "Admin"}
    )
    login_resp = client.post(
        "/auth/login",
        json={"email": "profile_test@insightforge.ai", "password": "securepassword123"}
    )
    token = login_resp.json()["access_token"]
    
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == "profile_test@insightforge.ai"
    assert profile["role"] == "Admin"

def test_auth_refresh_and_logout_revokes_session() -> None:
    """
    Test refresh token rotation and logout session revocation.
    """
    client.post(
        "/auth/register",
        json={"email": "refresh_test@insightforge.ai", "password": "securepassword123", "role": "Analyst"}
    )
    login_resp = client.post(
        "/auth/login",
        json={"email": "refresh_test@insightforge.ai", "password": "securepassword123"}
    )
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    refreshed = refresh_resp.json()
    assert refreshed["refresh_token"] != refresh_token
    assert refreshed["access_token"] != login_resp.json()["access_token"]

    stale_resp = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert stale_resp.status_code == 401

    logout_resp = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {refreshed['access_token']}"},
        json={"refresh_token": refreshed["refresh_token"]}
    )
    assert logout_resp.status_code == 200

    revoked_resp = client.post(
        "/auth/refresh",
        json={"refresh_token": refreshed["refresh_token"]}
    )
    assert revoked_resp.status_code == 401

def test_auth_invalid_credentials() -> None:
    """
    Test login with wrong password returns 401.
    """
    client.post(
        "/auth/register",
        json={"email": "wrong_pwd@insightforge.ai", "password": "securepassword123"}
    )
    response = client.post(
        "/auth/login",
        json={"email": "wrong_pwd@insightforge.ai", "password": "incorrectpassword"}
    )
    assert response.status_code == 401
    assert "Incorrect email" in response.json()["detail"]
