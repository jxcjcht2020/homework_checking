import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("student_user_id", "assignment_id", name="uq_submission_student_assignment"),)

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"submission_{uuid.uuid4().hex[:10]}"
    )
    student_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), index=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    submitted_at: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="submitted")

    student_user = relationship("User", back_populates="submissions")
    assignment = relationship("Assignment", back_populates="submissions")
    review = relationship("Review", back_populates="submission", uselist=False)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("student_user_id", "assignment_id", name="uq_review_student_assignment"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"review_{uuid.uuid4().hex[:10]}")
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), unique=True, index=True)
    student_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), index=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    student_name: Mapped[str] = mapped_column(String(128))
    assignment_name: Mapped[str] = mapped_column(String(255))
    course_title: Mapped[str] = mapped_column(String(255))
    review_date: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(255))
    tag: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    scores: Mapped[dict] = mapped_column(JSON, default=dict)
    dimension_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    overall_comment: Mapped[str] = mapped_column(Text)
    academic_comment: Mapped[str] = mapped_column(Text)
    consistency_comment: Mapped[str] = mapped_column(Text)
    standard_comment: Mapped[str] = mapped_column(Text)
    suggestions: Mapped[list] = mapped_column(JSON, default=list)
    matrix: Mapped[list] = mapped_column(JSON, default=list)
    markdown_content: Mapped[str] = mapped_column(Text)
    markdown_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    record_json_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    report_html_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    submission = relationship("Submission", back_populates="review")
    assignment = relationship("Assignment", back_populates="reviews")
    student_user = relationship("User", back_populates="reviews")
