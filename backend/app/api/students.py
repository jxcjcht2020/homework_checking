from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db, require_role
from app.core.security import hash_password
from app.models import Course, CourseStudent, User
from app.schemas.course import TeacherStudentListItemResponse, StudentCreateRequest, StudentImportRequest, StudentResponse


router = APIRouter()


def serialize_student(enrollment: CourseStudent) -> StudentResponse:
    return StudentResponse(
        id=enrollment.student_user.student_id or enrollment.student_user.id,
        name=enrollment.student_user.name,
        major=enrollment.major,
        class_name=enrollment.class_name,
        contact=enrollment.contact_snapshot,
        course_id=enrollment.course_id,
    )


def serialize_teacher_student_list_item(enrollment: CourseStudent) -> TeacherStudentListItemResponse:
    return TeacherStudentListItemResponse(
        id=enrollment.student_user.student_id or enrollment.student_user.id,
        name=enrollment.student_user.name,
        major=enrollment.major,
        class_name=enrollment.class_name,
        contact=enrollment.contact_snapshot,
        course_id=enrollment.course_id,
        course_name=enrollment.course.name,
        level_id=enrollment.course.level_id,
        level_name=enrollment.course.level.name if enrollment.course.level else enrollment.course.level_id,
    )


def upsert_student_enrollment(db: Session, course_id: str, payload: StudentCreateRequest) -> CourseStudent:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    user = db.query(User).filter(User.student_id == payload.student_id).one_or_none()
    if not user:
        user = User(
            role="student",
            name=payload.name,
            contact=payload.contact,
            student_id=payload.student_id,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        db.flush()
    else:
        user.is_active = True
        user.name = payload.name
        user.contact = payload.contact

    enrollment = (
        db.query(CourseStudent)
        .filter(CourseStudent.course_id == course_id, CourseStudent.student_user_id == user.id)
        .one_or_none()
    )
    if not enrollment:
        enrollment = CourseStudent(
            course_id=course_id,
            student_user_id=user.id,
            major=payload.major,
            class_name=payload.class_name,
            contact_snapshot=payload.contact,
        )
        db.add(enrollment)
    else:
        enrollment.major = payload.major
        enrollment.class_name = payload.class_name
        enrollment.contact_snapshot = payload.contact

    db.flush()
    enrollment.student_user = user
    return enrollment


@router.get("/courses/{course_id}/students", response_model=list[StudentResponse])
def list_students(
    course_id: str,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> list[StudentResponse]:
    enrollments = (
        db.query(CourseStudent)
        .options(joinedload(CourseStudent.student_user))
        .filter(CourseStudent.course_id == course_id, CourseStudent.student_user.has(User.is_active.is_(True)))
        .all()
    )
    return [serialize_student(item) for item in enrollments]


@router.get("/students", response_model=list[TeacherStudentListItemResponse])
def list_teacher_students(
    level_id: str | None = Query(default=None),
    course_id: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> list[TeacherStudentListItemResponse]:
    query = (
        db.query(CourseStudent)
        .options(
            joinedload(CourseStudent.student_user),
            joinedload(CourseStudent.course).joinedload(Course.level),
        )
        .filter(CourseStudent.student_user.has(User.is_active.is_(True)))
    )

    if level_id:
        query = query.join(Course, Course.id == CourseStudent.course_id).filter(Course.level_id == level_id)
    if course_id:
        query = query.filter(CourseStudent.course_id == course_id)
    if keyword:
        normalized = f"%{keyword.strip()}%"
        if normalized != "%%":
            query = query.join(User, User.id == CourseStudent.student_user_id).filter(
                (User.name.ilike(normalized)) | (User.student_id.ilike(normalized))
            )

    enrollments = query.order_by(CourseStudent.created_at.desc()).all()
    return [serialize_teacher_student_list_item(item) for item in enrollments]


@router.post("/courses/{course_id}/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def add_student(
    course_id: str,
    payload: StudentCreateRequest,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> StudentResponse:
    enrollment = upsert_student_enrollment(db, course_id, payload)
    db.commit()
    return serialize_student(enrollment)


@router.post("/courses/{course_id}/students/import")
def import_students(
    course_id: str,
    payload: StudentImportRequest,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> dict[str, int]:
    lines = [line.strip() for line in payload.raw_text.splitlines() if line.strip()]
    if len(lines) <= 1:
        return {"count": 0}

    count = 0
    for line in lines[1:]:
        cells = [item.strip() for item in (line.split("\t") if "\t" in line else line.split(","))]
        if len(cells) < 2:
            continue
        name, student_id, major, class_name, contact = (cells + ["", "", ""])[:5]
        try:
            upsert_student_enrollment(
                db,
                course_id,
                StudentCreateRequest(
                    name=name,
                    student_id=student_id,
                    major=major or "未填写",
                    class_name=class_name or "未填写",
                    contact=contact or "未填写",
                ),
            )
            count += 1
        except HTTPException:
            continue

    db.commit()
    return {"count": count}


@router.get("/students/me/profile")
def my_profile(current_user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    enrollment = (
        db.query(CourseStudent)
        .filter(CourseStudent.student_user_id == current_user.id)
        .order_by(CourseStudent.created_at.asc())
        .first()
    )
    return {
        "id": current_user.student_id or current_user.id,
        "name": current_user.name,
        "contact": current_user.contact,
        "major": enrollment.major if enrollment else "",
        "class_name": enrollment.class_name if enrollment else "",
    }


@router.get("/students/me/courses")
def my_courses(current_user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    enrollments = (
        db.query(CourseStudent)
        .options(joinedload(CourseStudent.course))
        .filter(CourseStudent.student_user_id == current_user.id)
        .all()
    )
    return [
        {"id": item.course.id, "level_id": item.course.level_id, "name": item.course.name}
        for item in enrollments
    ]
