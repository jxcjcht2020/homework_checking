from pydantic import BaseModel


class SubmissionResponse(BaseModel):
    id: str
    student_id: str
    assignment_id: str
    course_id: str
    file_name: str
    submitted_at: str
    status: str
