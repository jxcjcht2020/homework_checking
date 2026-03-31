from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    role: str
    identifier: str
    password: str


class RegisterRequest(BaseModel):
    role: str
    name: str
    identifier: str
    contact: str
    password: str = Field(min_length=6)
    confirm_password: str = Field(min_length=6)


class PasswordResetRequest(BaseModel):
    role: str
    identifier: str
    contact: str
    password: str = Field(min_length=6)
    confirm_password: str = Field(min_length=6)


class SessionUserResponse(BaseModel):
    id: str
    role: str
    name: str
    contact: str
    worker_id: str | None = None
    student_id: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: SessionUserResponse
