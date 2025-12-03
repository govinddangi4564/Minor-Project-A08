from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from uuid import UUID

# For login
class CompanyLoginSchema(BaseModel):
    email: EmailStr
    password: str

class CompanyLoginResponse(BaseModel):
    token: str
    company: dict

# Company profile response
class CompanyProfileResponse(BaseModel):
    companyID: UUID
    companyName: str
    companyEmail: EmailStr
    companyWebsite: Optional[str]
    companyAddress: Optional[str]
    companyDescription: Optional[str]
    plan: Optional[str]

    @field_validator("companyWebsite", mode="after")
    def convert_url(cls, v):
        return str(v) if v else v

# Update company profile
class CompanyUpdateSchema(BaseModel):
    companyName: str
    companyEmail: EmailStr
    companyWebsite: Optional[str]
    companyAddress: Optional[str]
    companyDescription: Optional[str]

    @field_validator("companyWebsite", mode="after")
    def convert_url(cls, v):
        return str(v) if v else v

# Change password
class ChangePasswordSchema(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str

# Register company
class RegisterCompanySchema(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    plan: str
    website: str
