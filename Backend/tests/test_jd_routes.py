from unittest.mock import MagicMock, patch
from uuid import uuid4
from main import app
from utils.security import get_authenticated_entity
from datetime import datetime

def test_create_jd_success(client, mock_db_session):
    """Test creating a JD."""
    with patch("services.jd_service.JDCompanyService.create") as mock_create:
        
        # Mock auth
        mock_company = MagicMock()
        mock_company.id = uuid4()
        
        # Mock service
        mock_jd = {
            "id": str(uuid4()),
            "title": "Software Engineer",
            "description": "Python dev",
            "location": "Remote",
            "company_id": str(mock_company.id),
            "created_at": datetime.now(),
            "updated_at": None,
            "created_by": str(mock_company.id),
            "department": None,
            "keywords": []
        }
        mock_create.return_value = mock_jd
        
        payload = {
            "title": "Software Engineer",
            "description": "Python dev",
            "location": "Remote",
            "requirements": "Python, FastAPI",
            "salary_range": "100k-120k"
        }
        
        # Override dependency
        app.dependency_overrides[get_authenticated_entity] = lambda: {"entity": mock_company, "type": "company"}

        response = client.post("/api/jds/", json=payload)
        
        app.dependency_overrides.pop(get_authenticated_entity)
        
        assert response.status_code == 201
        assert response.json()["title"] == "Software Engineer"

def test_get_all_jds(client, mock_db_session):
    """Test fetching all JDs."""
    with patch("services.jd_service.JDCompanyService.get_all") as mock_get_all:
        
        mock_company = MagicMock()
        mock_company.id = uuid4()
        
        mock_get_all.return_value = [
            {
                "id": str(uuid4()), 
                "title": "Dev 1", 
                "company_id": str(mock_company.id),
                "created_at": datetime.now(),
                "updated_at": None,
                "created_by": str(mock_company.id),
                "description": "Desc",
                "location": "Loc",
                "department": None,
                "keywords": []
            },
            {
                "id": str(uuid4()), 
                "title": "Dev 2", 
                "company_id": str(mock_company.id),
                "created_at": datetime.now(),
                "updated_at": None,
                "created_by": str(mock_company.id),
                "description": "Desc",
                "location": "Loc",
                "department": None,
                "keywords": []
            }
        ]
        
        app.dependency_overrides[get_authenticated_entity] = lambda: {"entity": mock_company, "type": "company"}
        
        response = client.get("/api/jds/")
        
        app.dependency_overrides.pop(get_authenticated_entity)
        
        assert response.status_code == 200
        assert len(response.json()) == 2
