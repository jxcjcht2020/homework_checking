import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"assignment_{uuid.uuid4().hex[:10]}"
    )
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[str] = mapped_column(String(32))
    standard_file_name: Mapped[str] = mapped_column(String(255))
    standard_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    standard_preview: Mapped[dict] = mapped_column(JSON, default=dict)
    collection_open: Mapped[bool] = mapped_column(Boolean, default=True)
    submitted_count: Mapped[int] = mapped_column(default=0)
    graded_count: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="assignment", cascade="all, delete-orphan")
