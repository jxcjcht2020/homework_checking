from fastapi import APIRouter

from app.api import assignments, auth, courses, growth, reviews, students, submissions


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(courses.router, tags=["courses"])
api_router.include_router(students.router, tags=["students"])
api_router.include_router(assignments.router, tags=["assignments"])
api_router.include_router(submissions.router, tags=["submissions"])
api_router.include_router(reviews.router, tags=["reviews"])
api_router.include_router(growth.router, tags=["growth"])
