from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["model_loaded"] is True
    assert "transformer_available" in body


def test_predict_validation():
    response = client.post("/api/v1/predict", json={"headline": "x", "content": "too short"})
    assert response.status_code == 422


def test_predict_and_verify():
    payload = {
        "headline": "Central bank holds interest rates steady after inflation cools",
        "content": (
            "The central bank left its benchmark interest rate unchanged on Wednesday, citing slower "
            "consumer-price growth over the past two quarters. Officials said they would continue to "
            "monitor labor-market data before considering further cuts."
        ),
    }
    pred = client.post("/api/v1/predict", json=payload)
    assert pred.status_code == 200
    body = pred.json()
    assert body["prediction"] in {"LIKELY_REAL", "LIKELY_FAKE", "UNCERTAIN"}
    assert "disclaimer" in body

    verify = client.post("/api/v1/verify", json=payload)
    assert verify.status_code == 200
    result = verify.json()
    assert result["id"]
    analysis = client.get(f"/api/v1/analysis/{result['id']}")
    assert analysis.status_code == 200
    history = client.get("/api/v1/history")
    assert history.status_code == 200
    claims = client.post("/api/v1/claims", json=payload)
    assert claims.status_code == 200
    evidence = client.post("/api/v1/evidence", json=payload)
    assert evidence.status_code == 200
    dash = client.get("/api/v1/dashboard")
    assert dash.status_code == 200


def test_auth_and_batch_verification():
    import uuid

    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "SecurePassword123!"},
    )
    assert reg.status_code == 200
    reg_data = reg.json()
    token = reg_data["access_token"]
    assert token

    # Test me endpoint
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == unique_email

    # Test login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "SecurePassword123!"},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["access_token"]

    # Test batch verification with auth
    batch_payload = {
        "items": [
            {
                "headline": "Official scientific study discovers high altitude water signatures",
                "content": "Researchers confirmed the presence of atmospheric water vapor after thorough spectroscopy analysis in 2024.",
            },
            {
                "headline": "SHOCKING: Secret overnight ban on bank withdrawals",
                "content": "They don't want you to know this secret emergency leak that freezes your bank accounts immediately!",
            },
        ],
        "model_type": "auto",
    }
    batch_resp = client.post(
        "/api/v1/verify-batch",
        json=batch_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert batch_resp.status_code == 200
    batch_data = batch_resp.json()
    assert batch_data["total_processed"] == 2
    assert len(batch_data["results"]) == 2
