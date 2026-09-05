def test_watchlist_crud_and_duplicate_prevention(client):
    # 1. Demo login
    res = client.post("/api/v1/auth/demo-login")
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get watchlists
    res = client.get("/api/v1/watchlists", headers=headers)
    assert res.status_code == 200
    watchlists = res.json()
    assert len(watchlists) >= 1
    wl_id = watchlists[0]["id"]

    # 3. Add stock
    res = client.post(f"/api/v1/watchlists/{wl_id}/items", json={"symbol": "WIPRO"}, headers=headers)
    assert res.status_code == 201
    assert res.json()["symbol"] == "WIPRO"

    # 4. Try adding duplicate stock
    res = client.post(f"/api/v1/watchlists/{wl_id}/items", json={"symbol": "WIPRO"}, headers=headers)
    assert res.status_code == 400
    assert "already present" in res.json()["detail"]

    # 5. Remove stock
    res = client.delete(f"/api/v1/watchlists/{wl_id}/items/WIPRO", headers=headers)
    assert res.status_code == 204
