from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models import Course, CourseStudent, Level
from app.schemas.course import CourseResponse, CreateCourseRequest, LevelResponse


router = APIRouter()


@router.get("/levels", response_model=list[LevelResponse])
def list_levels(db: Session = Depends(get_db)) -> list[Level]:
    return db.query(Level).order_by(Level.name).all()


@router.get("/courses", response_model=list[CourseResponse])
def list_courses(level_id: str | None = Query(default=None), db: Session = Depends(get_db)) -> list[Course]:
    query = db.query(Course)
    if level_id:
        query = query.filter(Course.level_id == level_id)
    return query.order_by(Course.created_at.desc()).all()


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)) -> Course:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CreateCourseRequest,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> Course:
    course = Course(level_id=payload.level_id, name=payload.name)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/{course_id}/dashboard")
def course_dashboard(course_id: str, db: Session = Depends(get_db), _teacher=Depends(require_role("teacher"))):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return {
        "studentCount": db.query(CourseStudent).filter(CourseStudent.course_id == course_id).count(),
        "assignmentCount": len(course.assignments),
    }
