from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole

# Base User Schema
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: Optional[UserRole] = UserRole.DRIVER

# Schema for public registration (no role field — always creates DRIVER)
class PublicUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

# Schema for Admin-only user creation (includes role)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

# Schema for User Profile Update (own profile)
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

# Schema for User Password Change
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters")

# Schema for User Update (Admin)
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)

# Schema specifically for Admin managing role & status
class UserStatusUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

# Schema for returning User data in responses
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Authentication Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None
