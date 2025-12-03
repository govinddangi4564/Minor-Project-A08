from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4
from main import app
from utils.security import get_authenticated_entity

def test_upload_resume_success(client, mock_db_session):
    """Test resume upload."""
    with patch("routes.resume_route.process_resume_pdf", new_callable=AsyncMock) as mock_process:
        
        mock_process.return_value = {"message": "Resume uploaded successfully", "id": str(uuid4())}
        
        mock_company = MagicMock()
        mock_company.id = uuid4()
        
        app.dependency_overrides[get_authenticated_entity] = lambda: {"entity": mock_company, "type": "company"}
        
        # Create a dummy PDF file
        files = {'file': ('resume.pdf', b'%PDF-1.4 content', 'application/pdf')}
        
        response = client.post("/api/resumes/parse", files=files)
        
        app.dependency_overrides.pop(get_authenticated_entity)
        
        assert response.status_code == 200
        assert "id" in response.json()

def test_upload_invalid_file_type(client, mock_db_session):
    """Test uploading invalid file type."""
    mock_company = MagicMock()
    
    app.dependency_overrides[get_authenticated_entity] = lambda: {"entity": mock_company, "type": "company"}
    
    files = {'file': ('resume.txt', b'text content', 'text/plain')}
    
    response = client.post("/api/resumes/parse", files=files)
    
    app.dependency_overrides.pop(get_authenticated_entity)
    
    assert response.status_code == 400
    # assert response.json()["detail"] == "Unsupported file type. Only PDF  are allowed."
