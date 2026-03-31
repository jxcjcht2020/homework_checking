from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models import Review, User
from app.schemas.review import GrowthEntryResponse


router = APIRouter()


def serialize_growth_entry(review: Review) -> GrowthEntryResponse:
    return GrowthEntryResponse(
        review_id=review.id,
        assignment_id=review.assignment_id,
        assignment_name=review.assignment_name,
        review_date=review.review_date,
        tag=review.tag,
        dimension_scores=review.dimension_scores,
        teacher_summary=review.summary,
        student_summary=(review.suggestions[0] if review.suggestions else review.summary),
    )


@router.get("/students/me/growth", response_model=list[GrowthEntryResponse])
def my_growth(db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    reviews = (
        db.query(Review)
        .filter(Review.student_user_id == current_user.id)
        .order_by(Review.review_date.asc())
        .all()
    )
    return [serialize_growth_entry(item) for item in reviews]


@router.get("/students/{student_identifier}/growth", response_model=list[GrowthEntryResponse])
def teacher_view_growth(
    student_identifier: str,
    db: Session = Depends(get_db),
    _teacher=Depends(require_role("teacher")),
):
    user = db.query(User).filter(User.student_id == student_identifier).one_or_none()
    if not user:
        return []
    reviews = db.query(Review).filter(Review.student_user_id == user.id).order_by(Review.review_date.asc()).all()
    return [serialize_growth_entry(item) for item in reviews]
