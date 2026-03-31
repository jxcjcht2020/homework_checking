import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(128))
    contact: Mapped[str] = mapped_column(String(64))
    worker_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    student_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    course_memberships = relationship("CourseStudent", back_populates="student_user")
    submissions = relationship("Submission", back_populates="student_user")
    reviews = relationship("Review", back_populates="student_user")
