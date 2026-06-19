"""Tests for transaction CRUD, pagination, filtering, search and ownership."""


def _make_tx(client, headers, **overrides):
    payload = {
        "amount": 100.0,
        "type": "expense",
        "description": "Lunch",
        "date": "2025-05-10",
        "category": "food",
    }
    payload.update(overrides)
    return client.post("/transactions/", json=payload, headers=headers)


def test_create_transaction(client, auth_headers):
    resp = _make_tx(client, auth_headers, amount=42.5, description="Coffee")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["amount"] == 42.5
    assert body["category"] == "food"
    assert body["id"] > 0


def test_create_transaction_rejects_invalid_amount(client, auth_headers):
    resp = _make_tx(client, auth_headers, amount=-5)
    assert resp.status_code == 422


def test_create_transaction_rejects_invalid_type(client, auth_headers):
    resp = _make_tx(client, auth_headers, type="transfer")
    assert resp.status_code == 422


def test_list_pagination(client, auth_headers):
    for i in range(5):
        _make_tx(client, auth_headers, amount=10 + i, description=f"tx{i}")
    resp = client.get("/transactions/?skip=0&limit=2", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 5
    assert body["limit"] == 2
    assert body["page"] == 1
    assert body["total_pages"] == 3
    assert len(body["items"]) == 2

    page2 = client.get("/transactions/?skip=2&limit=2", headers=auth_headers)
    assert page2.json()["page"] == 2
    assert len(page2.json()["items"]) == 2


def test_filter_by_category_and_type(client, auth_headers):
    _make_tx(client, auth_headers, category="food", type="expense", amount=20)
    _make_tx(client, auth_headers, category="salary", type="income", amount=500)
    _make_tx(client, auth_headers, category="food", type="expense", amount=30)

    food = client.get("/transactions/?category=food", headers=auth_headers)
    assert food.json()["total"] == 2

    income = client.get("/transactions/?type=income", headers=auth_headers)
    assert income.json()["total"] == 1
    assert income.json()["items"][0]["category"] == "salary"


def test_filter_by_date_range(client, auth_headers):
    _make_tx(client, auth_headers, date="2025-01-15", description="jan")
    _make_tx(client, auth_headers, date="2025-06-15", description="jun")
    _make_tx(client, auth_headers, date="2025-12-15", description="dec")

    resp = client.get(
        "/transactions/?start_date=2025-05-01&end_date=2025-07-01",
        headers=auth_headers,
    )
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["description"] == "jun"


def test_search(client, auth_headers):
    _make_tx(client, auth_headers, description="Grocery store", category="food")
    _make_tx(client, auth_headers, description="Gas bill", category="utilities")

    resp = client.get("/transactions/?search=grocery", headers=auth_headers)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["description"] == "Grocery store"


def test_update_transaction(client, auth_headers):
    created = _make_tx(client, auth_headers, amount=100).json()
    resp = client.put(
        f"/transactions/{created['id']}",
        json={
            "amount": 250.0,
            "type": "expense",
            "description": "Updated",
            "date": "2025-05-11",
            "category": "shopping",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["amount"] == 250.0
    assert resp.json()["category"] == "shopping"


def test_delete_transaction(client, auth_headers):
    created = _make_tx(client, auth_headers).json()
    resp = client.delete(f"/transactions/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204
    listing = client.get("/transactions/", headers=auth_headers)
    assert listing.json()["total"] == 0


def test_user_cannot_see_others_transactions(client, auth_headers, make_auth_headers):
    _make_tx(client, auth_headers, description="owner-only")
    other = make_auth_headers("intruder@example.com")
    resp = client.get("/transactions/", headers=other)
    assert resp.json()["total"] == 0


def test_user_cannot_edit_or_delete_others_transactions(
    client, auth_headers, make_auth_headers
):
    created = _make_tx(client, auth_headers).json()
    other = make_auth_headers("intruder2@example.com")

    update = client.put(
        f"/transactions/{created['id']}",
        json={
            "amount": 1.0,
            "type": "expense",
            "description": "hacked",
            "date": "2025-05-10",
            "category": "food",
        },
        headers=other,
    )
    assert update.status_code == 404

    delete = client.delete(f"/transactions/{created['id']}", headers=other)
    assert delete.status_code == 404
