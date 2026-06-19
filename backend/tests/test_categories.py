"""Tests for category CRUD and per-user scoping."""


def test_create_category(client, auth_headers):
    resp = client.post(
        "/categories/", json={"name": "Groceries"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Groceries"
    assert body["id"] > 0


def test_create_category_rejects_blank_name(client, auth_headers):
    resp = client.post("/categories/", json={"name": "   "}, headers=auth_headers)
    assert resp.status_code == 422


def test_list_categories(client, auth_headers):
    for name in ("Food", "Rent", "Travel"):
        client.post("/categories/", json={"name": name}, headers=auth_headers)
    resp = client.get("/categories/", headers=auth_headers)
    assert resp.status_code == 200
    names = {c["name"] for c in resp.json()}
    assert names == {"Food", "Rent", "Travel"}


def test_update_category(client, auth_headers):
    created = client.post(
        "/categories/", json={"name": "Old"}, headers=auth_headers
    ).json()
    resp = client.put(
        f"/categories/{created['id']}", json={"name": "New"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "New"


def test_delete_category(client, auth_headers):
    created = client.post(
        "/categories/", json={"name": "Temp"}, headers=auth_headers
    ).json()
    resp = client.delete(f"/categories/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204
    listing = client.get("/categories/", headers=auth_headers)
    assert listing.json() == []


def test_categories_are_scoped_to_owner(client, auth_headers, make_auth_headers):
    client.post("/categories/", json={"name": "Private"}, headers=auth_headers)
    other = make_auth_headers("cat-other@example.com")
    resp = client.get("/categories/", headers=other)
    assert resp.json() == []


def test_user_cannot_delete_others_category(client, auth_headers, make_auth_headers):
    created = client.post(
        "/categories/", json={"name": "Mine"}, headers=auth_headers
    ).json()
    other = make_auth_headers("cat-intruder@example.com")
    resp = client.delete(f"/categories/{created['id']}", headers=other)
    assert resp.status_code == 404
