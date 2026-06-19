"""Tests for authentication: registration, login, and protected-route access."""


def test_register_success(client):
    resp = client.post(
        "/auth/register",
        json={"email": "newuser@example.com", "password": "password123"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == "newuser@example.com"
    assert "id" in body
    # Password (or its hash) must never be returned.
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_email_rejected(client):
    payload = {"email": "dupe@example.com", "password": "password123"}
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 200, first.text
    second = client.post("/auth/register", json=payload)
    assert second.status_code == 400
    assert "already registered" in second.json()["detail"].lower()


def test_register_rejects_weak_password(client):
    resp = client.post(
        "/auth/register",
        json={"email": "weak@example.com", "password": "short"},
    )
    assert resp.status_code == 422


def test_login_success(client):
    client.post(
        "/auth/register",
        json={"email": "login@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/login",
        data={"username": "login@example.com", "password": "password123"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_rejected(client):
    client.post(
        "/auth/register",
        json={"email": "wrongpw@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/login",
        data={"username": "wrongpw@example.com", "password": "not-the-password"},
    )
    assert resp.status_code == 400
    assert "incorrect" in resp.json()["detail"].lower()


def test_protected_route_rejects_missing_token(client):
    resp = client.get("/transactions/")
    assert resp.status_code == 401


def test_protected_route_rejects_invalid_token(client):
    resp = client.get(
        "/transactions/",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401


def test_protected_route_accepts_valid_token(client, auth_headers):
    resp = client.get("/transactions/", headers=auth_headers)
    assert resp.status_code == 200
