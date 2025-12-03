from unittest.mock import MagicMock, patch
from schemas.company_schema import RegisterCompanySchema
from main import app
from utils.security import get_authenticated_entity
from uuid import uuid4

def test_register_company_success(client, mock_db_session):
    """Test successful company registration."""
    with patch("routes.company_route.register_company") as mock_register:
        
        # Mock return value
        mock_company = MagicMock()
        mock_company.id = uuid4()
        mock_company.name = "Test Corp"
        mock_company.email = "corp@example.com"
        mock_company.website = "https://example.com"
        mock_register.return_value = mock_company
        
        payload = {
            "name": "Test Corp",
            "email": "corp@example.com",
            "password": "password123",
            "website": "https://example.com",
            "location": "New York",
            "description": "A test company",
            "plan": "basic" # Added missing field
        }
        
        response = client.post("/api/companies/register", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["companyName"] == "Test Corp"

def test_company_login_success(client, mock_db_session):
    """Test successful company login."""
    with patch("routes.company_route.login_company") as mock_login:
        
        mock_login.return_value = {
            "token": "access_token",
            "company": {
                "id": str(uuid4()),
                "name": "Test Corp"
            }
        }
        
        payload = {
            "email": "corp@example.com",
            "password": "password123"
        }
        
        response = client.post("/api/auth/company/login", json=payload)
        
        assert response.status_code == 200
        assert response.json()["token"] == "access_token"

def test_get_company_profile(client, mock_db_session):
    """Test getting company profile (requires auth)."""
    with patch("routes.company_route.get_company_profile") as mock_get_profile:
        
        # Mock auth
        mock_company = MagicMock()
        mock_company.id = uuid4()
        
        # Mock profile service
        mock_get_profile.return_value = {
            "companyID": mock_company.id,
            "companyName": "Test Corp",
            "companyEmail": "corp@example.com",
            "companyWebsite": "https://example.com"
        }
        
        # Override dependency
        app.dependency_overrides[get_authenticated_entity] = lambda: {"entity": mock_company, "type": "company"}
        
        response = client.get("/api/company/profile")
        
        app.dependency_overrides.pop(get_authenticated_entity)
        
        assert response.status_code == 200
        assert response.json()["companyName"] == "Test Corp"
