from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordResetRequest,
    RegisterRequest,
    SessionUserResponse,
)


router = APIRouter()


def to_session_user(user: User) -> SessionUserResponse:
    return SessionUserResponse(
        id=user.id,
        role=user.role,
        name=user.name,
        contact=user.contact,
        worker_id=user.worker_id,
        student_id=user.student_id,
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    query = db.query(User).filter(User.role == payload.role)
    if payload.role == "teacher":
        query = query.filter(User.worker_id == payload.identifier)
    else:
        query = query.filter(User.student_id == payload.identifier)
    user = query.one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    return AuthResponse(
        access_token=create_access_token(user.id, user.role),
        user=to_session_user(user),
    )


@router.post("/register", response_model=SessionUserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> SessionUserResponse:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="两次输入的密码不一致。")
    if payload.role not in {"teacher", "student"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="账号角色不合法。")

    query = db.query(User).filter(User.role == payload.role)
    if payload.role == "teacher":
        query = query.filter(User.worker_id == payload.identifier)
    else:
        query = query.filter(User.student_id == payload.identifier)

    same_identifier_user = query.one_or_none()
    if same_identifier_user:
        if same_identifier_user.name == payload.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该姓名与学/工号组合已注册，请直接登录或重置密码。",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该学/工号已被其他姓名占用，请核对后再试。",
        )

    user = User(
        role=payload.role,
        name=payload.name,
        contact=payload.contact,
        worker_id=payload.identifier if payload.role == "teacher" else None,
        student_id=payload.identifier if payload.role == "student" else None,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_session_user(user)


@router.post("/password/reset", response_model=SessionUserResponse)
def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> SessionUserResponse:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match.")

    query = db.query(User).filter(User.role == payload.role, User.contact == payload.contact)
    if payload.role == "teacher":
        query = query.filter(User.worker_id == payload.identifier)
    else:
        query = query.filter(User.student_id == payload.identifier)
    user = query.one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matched account not found.")

    user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return to_session_user(user)


@router.get("/me", response_model=SessionUserResponse)
def me(current_user: User = Depends(get_current_user)) -> SessionUserResponse:
    return to_session_user(current_user)
