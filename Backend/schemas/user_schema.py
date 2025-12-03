from pydantic import BaseModel, EmailStr
from uuid import UUID


class UserRegisterSchema(BaseModel):
    fullName: str | None = None
    email: EmailStr
    password: str
    phone: str | None = None
    newsletter: bool | None = None
    picture: str | None = None


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    token: str


class UserResponseSchema(BaseModel):
    token: str
    refresh_token: str
    user_id: UUID
    fullName: str | None = None
    email: EmailStr
    phone: str | None = None
    newsletter: bool | None = None
    picture: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str


class PasswordForgetRequest(BaseModel):
    email: EmailStr
