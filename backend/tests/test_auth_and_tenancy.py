def register(client, email="owner@example.com", workspace="Acme Services"):
    return client.post(
        "/api/v1/auth/register",
        json={
            "name": "Asha Rao",
            "email": email,
            "password": "a-strong-password",
            "workspace_name": workspace,
        },
    )


def test_register_login_and_workspace_dashboard(client):
    created = register(client)
    assert created.status_code == 201
    body = created.json()
    assert body["user"]["email"] == "owner@example.com"
    assert body["workspaces"][0]["name"] == "Acme Services"
    assert body["access_token"]

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "OWNER@example.com", "password": "a-strong-password"},
    )
    assert login.status_code == 200
    workspace_id = body["workspaces"][0]["id"]
    dashboard = client.get(
        "/api/v1/dashboard",
        headers={
            "Authorization": f"Bearer {body['access_token']}",
            "X-Workspace-ID": workspace_id,
        },
    )
    assert dashboard.status_code == 200
    assert dashboard.json()["workspace_name"] == "Acme Services"


def test_workspace_data_is_not_visible_to_another_user(client):
    register(client)
    other = register(client, "other@example.com", "Other Business").json()
    response = client.get(
        "/api/v1/dashboard",
        headers={
            "Authorization": f"Bearer {other['access_token']}",
            "X-Workspace-ID": "00000000-0000-0000-0000-000000000001",
        },
    )
    assert response.status_code == 404


def test_duplicate_account_and_bad_password_are_rejected(client):
    register(client)
    assert register(client).status_code == 409
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_protected_dashboard_requires_authentication(client):
    response = client.get(
        "/api/v1/dashboard", headers={"X-Workspace-ID": "00000000-0000-0000-0000-000000000001"}
    )
    assert response.status_code == 401


def test_profile_and_workspace_can_be_managed_by_owner(client):
    created = register(client).json()
    headers = {
        "Authorization": f"Bearer {created['access_token']}",
        "X-Workspace-ID": created["workspaces"][0]["id"],
    }
    profile = client.patch("/api/v1/auth/me", headers=headers, json={"name": "Asha Singh"})
    assert profile.status_code == 200
    assert profile.json()["user"]["name"] == "Asha Singh"

    extra = client.post("/api/v1/workspaces", headers=headers, json={"name": "Second Studio"})
    assert extra.status_code == 201
    assert extra.json()["role"] == "owner"

    renamed = client.patch("/api/v1/workspaces/current", headers=headers, json={"name": "Acme Group"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Acme Group"
