import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Level(Base):
    __tablename__ = "levels"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)

    courses = relationship("Course", back_populates="level")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"course_{uuid.uuid4().hex[:10]}")
    level_id: Mapped[str] = mapped_column(ForeignKey("levels.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    level = relationship("Level", back_populates="courses")
    students = relationship("CourseStudent", back_populates="course", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")


class CourseStudent(Base):
    __tablename__ = "course_students"
    __table_args__ = (UniqueConstraint("course_id", "student_user_id", name="uq_course_student"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"enroll_{uuid.uuid4().hex[:10]}")
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    student_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    major: Mapped[str] = mapped_column(String(128))
    class_name: Mapped[str] = mapped_column(String(128))
    contact_snapshot: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="students")
    student_user = relationship("User", back_populates="course_memberships")
