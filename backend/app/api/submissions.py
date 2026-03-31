from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import get_db, require_role
from app.models import Assignment, Submission, User
from app.schemas.submission import SubmissionResponse
from app.services.grading_service import grade_submission_job
from app.services.storage_service import save_upload


router = APIRouter()


def serialize_submission(submission: Submission) -> SubmissionResponse:
    student_id = submission.student_user.student_id if submission.student_user else submission.student_user_id
    return SubmissionResponse(
        id=submission.id,
        student_id=student_id,
        assignment_id=submission.assignment_id,
        course_id=submission.course_id,
        file_name=submission.file_name,
        submitted_at=submission.submitted_at,
        status=submission.status,
    )


@router.get("/submissions", response_model=list[SubmissionResponse])
def list_submissions(
    assignment_id: str | None = None,
    course_id: str | None = None,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> list[SubmissionResponse]:
    query = db.query(Submission).options(joinedload(Submission.student_user))
    if assignment_id:
        query = query.filter(Submission.assignment_id == assignment_id)
    if course_id:
        query = query.filter(Submission.course_id == course_id)
    rows = query.order_by(Submission.submitted_at.desc()).all()
    return [serialize_submission(item) for item in rows]


@router.post("/submissions", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_homework(
    background_tasks: BackgroundTasks,
    assignment_id: str = Form(...),
    course_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> SubmissionResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if not assignment.collection_open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment is not collecting.")

    target_dir = settings.submissions_dir / course_id / assignment_id / (current_user.student_id or current_user.id)
    file_name, file_path = await save_upload(file, target_dir)

    submission = (
        db.query(Submission)
        .options(joinedload(Submission.student_user))
        .filter(Submission.student_user_id == current_user.id, Submission.assignment_id == assignment_id)
        .one_or_none()
    )
    if not submission:
        submission = Submission(
            student_user_id=current_user.id,
            assignment_id=assignment_id,
            course_id=course_id,
            file_name=file_name,
            file_path=file_path,
            submitted_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
            status="submitted",
        )
        db.add(submission)
    else:
        submission.file_name = file_name
        submission.file_path = file_path
        submission.submitted_at = datetime.now().strftime("%Y-%m-%d %H:%M")
        submission.status = "submitted"

    db.flush()
    submission.status = "submitted"
    assignment.submitted_count = db.query(Submission).filter(Submission.assignment_id == assignment_id).count()
    db.commit()
    db.refresh(submission)
    submission.student_user = current_user
    background_tasks.add_task(grade_submission_job, submission.id)
    return serialize_submission(submission)
