from fastapi import APIRouter, HTTPException, Depends
from schemas.user_schema import UserRegisterSchema, UserLoginSchema, UserResponseSchema, RefreshRequest, PasswordResetRequest, PasswordForgetRequest, GoogleLoginRequest
from services.user_service import register_user_service, get_user_by_email_service, send_password_reset_email, update_password
from utils.log_config import logger
from utils.security import verify_password, create_access_token, create_refresh_token, decode_token
import jwt
user_router = APIRouter()


@user_router.post("/register")
async def register_user(user: UserRegisterSchema):

    existing_user = await get_user_by_email_service(user.email)
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        await register_user_service(user, role="user")
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return {"message": f"Error registering user: {user.fullName}"}

    return {"message": f"User {user.fullName} registered successfully"}



@user_router.post("/login", response_model=UserResponseSchema)
async def login_user(user: UserLoginSchema):
    existing_user = await get_user_by_email_service(user.email)

    if not existing_user or verify_password(user.password, existing_user.password) is False:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    data = {
        "entity": str(existing_user.user_id),
        "type": "user"
    }

    token = create_access_token(data)
    refresh_token = create_refresh_token(data)

    resp = {
        'token': token,
        'refresh_token': refresh_token,
        'user_id': existing_user.user_id,
        'fullName': existing_user.full_name,
        'email': existing_user.email,
        'phone': existing_user.phone,
        'newsletter': existing_user.newsletter,
        'picture': existing_user.picture
    }

    return resp


@user_router.post("/refresh")
def refresh_token(request: RefreshRequest):
    try:
        payload = decode_token(request.refresh_token)
        user_id = payload.get("user_id")
        email = payload.get("email")
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    # Issue new access token
    access_token = create_access_token(data={"user_id": user_id, "email": email})
    return {"token": access_token}


@user_router.post("/forget-password")
async def forget_password(pw: PasswordForgetRequest):
    email = pw.email
    existing_user = await get_user_by_email_service(email)
    
    if not existing_user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    try:
        await send_password_reset_email(existing_user)
        logger.info(f"Password reset requested for email: {email}")
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        raise HTTPException(status_code=500, detail="Error sending password reset email")
    
    return {"message": f"Password reset link sent to {email}"}


@user_router.post("/reset-password")
async def reset_password(rp: PasswordResetRequest):
    try:
        payload = decode_token(rp.token)
        user_id = payload.get("user_id")
        email = payload.get("email")
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await get_user_by_email_service(email)
    if not user or str(user.user_id) != user_id:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        await update_password(user, rp.new_password)
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail="Error resetting password")

    return {"message": "Password reset successful"}


import requests
import uuid

@user_router.post("/google-login", response_model=UserResponseSchema)
async def google_login(request: GoogleLoginRequest):
    token = request.token
    try:
        # Verify token with Google
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
        if response.status_code != 200:
            # Try checking if it's an access token (for OAuth2 flow fallback)
            response = requests.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={token}")
            if response.status_code != 200:
                 raise HTTPException(status_code=401, detail="Invalid Google token")
        
        google_data = response.json()
        email = google_data.get("email")
        name = google_data.get("name")
        picture = google_data.get("picture")
        
        if not email:
             raise HTTPException(status_code=400, detail="Email not found in Google token")

        # Check if user exists
        existing_user = await get_user_by_email_service(email)
        
        if not existing_user:
            # Register new user
            new_user = UserRegisterSchema(
                fullName=name,
                email=email,
                password=str(uuid.uuid4()), # Random password
                picture=picture,
                phone="",
                newsletter=True
            )
            await register_user_service(new_user, role="user")
            existing_user = await get_user_by_email_service(email)
            
        # Login (Create tokens)
        data = {
            "entity": str(existing_user.user_id),
            "type": "user"
        }

        token = create_access_token(data)
        refresh_token = create_refresh_token(data)

        return {
            'token': token,
            'refresh_token': refresh_token,
            'user_id': existing_user.user_id,
            'fullName': existing_user.full_name,
            'email': existing_user.email,
            'phone': existing_user.phone,
            'newsletter': existing_user.newsletter,
            'picture': existing_user.picture
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Google login error: {e}")
        raise HTTPException(status_code=500, detail=f"Google login failed: {str(e)}")
