from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_admin, get_current_manager_or_admin
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.schemas.user import (
    PublicUserCreate,
    UserCreate,
    UserProfileUpdate,
    PasswordChangeRequest,
    UserResponse,
    LoginRequest,
    Token,
    UserStatusUpdate,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Users"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: PublicUserCreate, db: Session = Depends(get_db)):
    """Register a new user account. Always creates a DRIVER role."""
    # Check if email is already registered
    existing_user = db.query(User).filter(User.email.ilike(user_in.email.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Hash the password
    hashed_pwd = get_password_hash(user_in.password)

    # Create new user — public registration is always DRIVER
    new_user = User(
        email=user_in.email.strip().lower(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name.strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        role=UserRole.DRIVER,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT token
    access_token = create_access_token(subject=new_user.id, role=new_user.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password."""
    user = db.query(User).filter(User.email.ilike(credentials.email.strip())).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your fleet administrator."
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get profile of currently logged-in user."""
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """(Self) Update profile details (full_name, phone)."""
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone.strip()
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    pwd_in: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """(Self) Change password requiring current password verification."""
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password changed successfully."}

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """(Admin Only) Create a staff user with role (e.g. FLEET_MANAGER)."""
    existing_user = db.query(User).filter(User.email.ilike(user_in.email.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    new_user = User(
        email=user_in.email.strip().lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        role=user_in.role or UserRole.DRIVER,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/users", response_model=List[UserResponse])
def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """(Admin Only) List all registered users with optional search and role filtering."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(search_fmt)) | (User.email.ilike(search_fmt))
        )
    return query.order_by(User.id.asc()).all()

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user_status_or_role(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """(Admin Only) Update user role or active status."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Prevent Admin from demoting or deactivating their own account
    if target_user.id == admin.id and status_update.role and status_update.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote your own administrator account."
        )

    if status_update.role is not None:
        target_user.role = status_update.role
    if status_update.is_active is not None:
        target_user.is_active = status_update.is_active

    db.commit()
    db.refresh(target_user)
    return target_user

@router.get("/stats")
def get_user_statistics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_manager_or_admin)
):
    """(Admin / Fleet Manager) Get user and staff distribution statistics."""
    total_users = db.query(User).count()
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN).count()
    total_managers = db.query(User).filter(User.role == UserRole.FLEET_MANAGER).count()
    total_drivers = db.query(User).filter(User.role == UserRole.DRIVER).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    return {
        "total_users": total_users,
        "admins": total_admins,
        "fleet_managers": total_managers,
        "drivers": total_drivers,
        "active_users": active_users
    }
