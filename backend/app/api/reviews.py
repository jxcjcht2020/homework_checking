from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db, require_role
from app.models import Assignment, Course, CourseStudent, Review, Submission, User
from app.schemas.review import ReviewResponse


router = APIRouter()


def serialize_review(review: Review, db: Session) -> ReviewResponse:
    student = review.student_user or db.get(User, review.student_user_id)
    return ReviewResponse(
        id=review.id,
        student_id=student.student_id if student else review.student_user_id,
        assignment_id=review.assignment_id,
        course_id=review.course_id,
        student_name=review.student_name,
        assignment_name=review.assignment_name,
        course_title=review.course_title,
        review_date=review.review_date,
        title=review.title,
        tag=review.tag,
        summary=review.summary,
        scores=review.scores,
        dimension_scores=review.dimension_scores,
        overall_comment=review.overall_comment,
        academic_comment=review.academic_comment,
        consistency_comment=review.consistency_comment,
        standard_comment=review.standard_comment,
        suggestions=review.suggestions,
        matrix=review.matrix,
        markdown_content=review.markdown_content,
        markdown_path=review.markdown_path,
        record_json_path=review.record_json_path,
        report_html_path=review.report_html_path,
    )


def serialize_submission(submission: Submission) -> dict:
    return {
        "id": submission.id,
        "student_id": submission.student_user.student_id if submission.student_user else submission.student_user_id,
        "assignment_id": submission.assignment_id,
        "course_id": submission.course_id,
        "file_name": submission.file_name,
        "submitted_at": submission.submitted_at,
        "status": submission.status,
    }


@router.get("/assignments/{assignment_id}/reviews", response_model=list[ReviewResponse])
def list_assignment_reviews(
    assignment_id: str,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
) -> list[ReviewResponse]:
    reviews = (
        db.query(Review)
        .options(joinedload(Review.student_user))
        .filter(Review.assignment_id == assignment_id)
        .order_by(Review.review_date.desc())
        .all()
    )
    return [serialize_review(item, db) for item in reviews]


@router.get("/reviews/find", response_model=ReviewResponse)
def find_review(
    assignment_id: str,
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewResponse:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This endpoint is for student self-query only.")

    review = (
        db.query(Review)
        .options(joinedload(Review.student_user))
        .filter(
            Review.student_user_id == current_user.id,
            Review.assignment_id == assignment_id,
            Review.course_id == course_id,
        )
        .one_or_none()
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
    return serialize_review(review, db)


@router.get("/students/me/assignments")
def list_my_assignments(
    course_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    enrollments = (
        db.query(CourseStudent)
        .options(joinedload(CourseStudent.course).joinedload(Course.level))
        .filter(CourseStudent.student_user_id == current_user.id)
        .all()
    )
    course_ids = [item.course_id for item in enrollments if not course_id or item.course_id == course_id]
    if not course_ids:
        return []

    assignments = (
        db.query(Assignment)
        .options(joinedload(Assignment.course).joinedload(Course.level))
        .filter(Assignment.course_id.in_(course_ids))
        .order_by(Assignment.created_at.desc())
        .all()
    )

    result = []
    for assignment in assignments:
        submission = (
            db.query(Submission)
            .options(joinedload(Submission.student_user))
            .filter(Submission.student_user_id == current_user.id, Submission.assignment_id == assignment.id)
            .one_or_none()
        )
        review = (
            db.query(Review)
            .options(joinedload(Review.student_user))
            .filter(Review.student_user_id == current_user.id, Review.assignment_id == assignment.id)
            .one_or_none()
        )
        result.append(
            {
                "id": assignment.id,
                "name": assignment.name,
                "level_id": assignment.course.level_id if assignment.course else "",
                "course_id": assignment.course_id,
                "course_name": assignment.course.name if assignment.course else "",
                "created_at": assignment.created_at,
                "standard_file_name": assignment.standard_file_name,
                "standard_preview": assignment.standard_preview,
                "collection_open": assignment.collection_open,
                "submitted_count": assignment.submitted_count,
                "graded_count": assignment.graded_count,
                "status": "已批改" if review else "已提交" if submission else "未提交",
                "submission": serialize_submission(submission) if submission else None,
                "review": serialize_review(review, db) if review else None,
            }
        )
    return result
