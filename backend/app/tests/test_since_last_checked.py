def test_since_last_checked_feed_and_acknowledge(client):
    # 1. Login
    res = client.post("/api/v1/auth/demo-login")
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get since-last-check feed
    res = client.get("/api/v1/attention/since-last-check", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "events" in data
    assert data["summary"]["total_watched"] >= 5

    # 3. Acknowledge seen
    res = client.post("/api/v1/attention/acknowledge-seen", headers=headers)
    assert res.status_code == 200

    # 4. Re-fetch feed -> elapsed_time_formatted should indicate "Just now" or recent
    res = client.get("/api/v1/attention/since-last-check", headers=headers)
    assert res.status_code == 200
    new_data = res.json()
    assert "Just now" in new_data["summary"]["elapsed_time_formatted"] or "s ago" in new_data["summary"]["elapsed_time_formatted"]
