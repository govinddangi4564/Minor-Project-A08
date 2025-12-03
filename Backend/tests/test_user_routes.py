from unittest.mock import AsyncMock, patch, MagicMock
from schemas.user_schema import UserRegisterSchema
from uuid import uuid4

def test_register_user_success(client, mock_db_session):
    """Test successful user registration."""
    # Mock the service calls
    with patch("routes.user_route.get_user_by_email_service", new_callable=AsyncMock) as mock_get_user, \
         patch("routes.user_route.register_user_service", new_callable=AsyncMock) as mock_register:
        
        # Setup mocks
        mock_get_user.return_value = None  # User does not exist
        mock_register.return_value = None
        
        payload = {
            "fullName": "Test User",
            "email": "test@example.com",
            "password": "password123",
            "phone": "1234567890",
            "newsletter": False
        }
        
        response = client.post("/api/register", json=payload)
        
        assert response.status_code == 200
        assert response.json() == {"message": "User Test User registered successfully"}
        mock_get_user.assert_called_once_with("test@example.com")
        mock_register.assert_called_once()

def test_register_user_already_exists(client, mock_db_session):
    """Test registration when user already exists."""
    with patch("routes.user_route.get_user_by_email_service", new_callable=AsyncMock) as mock_get_user:
        
        # Setup mock to return an existing user object
        mock_user = MagicMock()
        mock_get_user.return_value = mock_user
        
        payload = {
            "fullName": "Test User",
            "email": "existing@example.com",
            "password": "password123",
            "phone": "1234567890",
            "newsletter": False
        }
        
        response = client.post("/api/register", json=payload)
        
        assert response.status_code == 400
        assert response.json() == {"message": "Email already registered"}

def test_login_user_success(client, mock_db_session):
    """Test successful user login."""
    with patch("routes.user_route.get_user_by_email_service", new_callable=AsyncMock) as mock_get_user, \
         patch("routes.user_route.verify_password") as mock_verify_pwd, \
         patch("routes.user_route.create_access_token") as mock_create_token, \
         patch("routes.user_route.create_refresh_token") as mock_create_refresh:
        
        # Mock user
        mock_user = MagicMock()
        mock_user.user_id = uuid4()
        mock_user.full_name = "Test User"
        mock_user.email = "test@example.com"
        mock_user.password = "hashed_password"
        mock_user.phone = "1234567890"
        mock_user.newsletter = False
        mock_user.picture = None
        
        mock_get_user.return_value = mock_user
        mock_verify_pwd.return_value = True
        mock_create_token.return_value = "access_token"
        mock_create_refresh.return_value = "refresh_token"
        
        payload = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        response = client.post("/api/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["token"] == "access_token"
        assert data["email"] == "test@example.com"
