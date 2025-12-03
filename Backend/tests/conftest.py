import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
import os

# Add the parent directory to sys.path to allow importing from main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from models.base import get_db
from utils.security import get_authenticated_entity

@pytest.fixture
def mock_db_session():
    """Returns a mock SQLAlchemy session."""
    return MagicMock()

@pytest.fixture
def client(mock_db_session):
    """Returns a TestClient with overridden dependencies."""
    def override_get_db():
        try:
            yield mock_db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()
