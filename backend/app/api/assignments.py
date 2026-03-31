from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import get_db, require_role
from app.models import Assignment, Course, CourseStudent
from app.schemas.assignment import AssignmentResponse
from app.services.standard_service import parse_standard_preview
from app.services.storage_service import read_text_if_possible, save_upload


router = APIRouter()


def serialize_assignment(db: Session, assignment: Assignment) -> AssignmentResponse:
    course = assignment.course or db.get(Course, assignment.course_id)
    due_count = db.query(CourseStudent).filter(CourseStudent.course_id == assignment.course_id).count()
    return AssignmentResponse(
        id=assignment.id,
        name=assignment.name,
        level_id=course.level_id if course else "",
        level_name=course.level.name if course and course.level else "",
        course_id=assignment.course_id,
        course_name=course.name if course else "",
        created_at=assignment.created_at,
        standard_file_name=assignment.standard_file_name,
        standard_preview=assignment.standard_preview,
        collection_open=assignment.collection_open,
        submitted_count=assignment.submitted_count,
        graded_count=assignment.graded_count,
        due_count=due_count,
    )


@router.get("/assignments", response_model=list[AssignmentResponse])
def list_assignments(
    course_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> list[AssignmentResponse]:
    query = db.query(Assignment).options(joinedload(Assignment.course).joinedload(Course.level))
    if course_id:
        query = query.filter(Assignment.course_id == course_id)
    assignments = query.order_by(Assignment.created_at.desc()).all()
    return [serialize_assignment(db, item) for item in assignments]


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: str, db: Session = Depends(get_db), _teacher=Depends(require_role("teacher"))):
    assignment = (
        db.query(Assignment)
        .options(joinedload(Assignment.course).joinedload(Course.level))
        .filter(Assignment.id == assignment_id)
        .one_or_none()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    return serialize_assignment(db, assignment)


@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    level_id: str = Form(...),
    course_id: str = Form(...),
    name: str = Form(...),
    created_at: str = Form(default_factory=lambda: datetime.now().strftime("%Y-%m-%d")),
    collection_open: bool = Form(True),
    standard_file_name: str | None = Form(default=None),
    preview_title: str | None = Form(default=None),
    preview_items_text: str | None = Form(default=None),
    preview_paragraphs_text: str | None = Form(default=None),
    standard_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> AssignmentResponse:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    if course.level_id != level_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level and course do not match.")

    resolved_standard_file_name = standard_file_name or (standard_file.filename if standard_file else "standard.md")
    standard_file_path = None
    standard_preview = {
        "title": preview_title or "Main Chain",
        "items": [item.strip() for item in (preview_items_text or "").splitlines() if item.strip()],
        "paragraphs": [item.strip() for item in (preview_paragraphs_text or "").splitlines() if item.strip()],
    }
    if standard_file:
        target_dir = settings.standards_dir / course_id / created_at
        resolved_standard_file_name, standard_file_path = await save_upload(standard_file, target_dir)
        standard_preview = parse_standard_preview(read_text_if_possible(standard_file_path))

    assignment = Assignment(
        course_id=course_id,
        name=name,
        created_at=created_at,
        standard_file_name=resolved_standard_file_name,
        standard_file_path=standard_file_path,
        standard_preview=standard_preview,
        collection_open=collection_open,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return serialize_assignment(db, assignment)


@router.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    level_id: str | None = Form(default=None),
    course_id: str | None = Form(default=None),
    name: str | None = Form(default=None),
    created_at: str | None = Form(default=None),
    collection_open: bool | None = Form(default=None),
    standard_file_name: str | None = Form(default=None),
    preview_title: str | None = Form(default=None),
    preview_items_text: str | None = Form(default=None),
    preview_paragraphs_text: str | None = Form(default=None),
    standard_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> AssignmentResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    next_course_id = course_id or assignment.course_id
    course = db.get(Course, next_course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    if level_id and course.level_id != level_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level and course do not match.")

    if course_id is not None:
        assignment.course_id = course_id
    if name is not None:
        assignment.name = name
    if created_at is not None:
        assignment.created_at = created_at
    if collection_open is not None:
        assignment.collection_open = collection_open

    if standard_file:
        target_dir = settings.standards_dir / next_course_id / (assignment.created_at or datetime.now().strftime("%Y-%m-%d"))
        standard_file_name, standard_file_path = await save_upload(standard_file, target_dir)
        assignment.standard_file_name = standard_file_name
        assignment.standard_file_path = standard_file_path
        assignment.standard_preview = parse_standard_preview(read_text_if_possible(standard_file_path))
    else:
        if standard_file_name is not None:
            assignment.standard_file_name = standard_file_name
        if preview_title is not None or preview_items_text is not None or preview_paragraphs_text is not None:
            assignment.standard_preview = {
                "title": preview_title or assignment.standard_preview.get("title") or "Main Chain",
                "items": [item.strip() for item in (preview_items_text or "").splitlines() if item.strip()]
                or assignment.standard_preview.get("items", []),
                "paragraphs": [item.strip() for item in (preview_paragraphs_text or "").splitlines() if item.strip()]
                or assignment.standard_preview.get("paragraphs", []),
            }

    db.commit()
    db.refresh(assignment)
    return serialize_assignment(db, assignment)


@router.post("/assignments/{assignment_id}/toggle-collection", response_model=AssignmentResponse)
def toggle_assignment_collection(
    assignment_id: str,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> AssignmentResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    assignment.collection_open = not assignment.collection_open
    db.commit()
    db.refresh(assignment)
    return serialize_assignment(db, assignment)


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> None:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    db.delete(assignment)
    db.commit()
