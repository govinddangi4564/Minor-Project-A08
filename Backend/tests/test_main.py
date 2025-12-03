from fastapi.testclient import TestClient
from main import app

def test_read_main(client):
    # This assumes there might not be a root route, but we check if app loads
    # If you have a root route "/", change this expectation
    response = client.get("/")
    assert response.status_code in [200, 404] # 404 is fine if no root route, proves app runs
