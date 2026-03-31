from pydantic import BaseModel


class StandardPreviewResponse(BaseModel):
    title: str
    items: list[str]
    paragraphs: list[str]


class AssignmentResponse(BaseModel):
    id: str
    name: str
    level_id: str
    level_name: str
    course_id: str
    course_name: str
    created_at: str
    standard_file_name: str
    standard_preview: StandardPreviewResponse
    collection_open: bool
    submitted_count: int
    graded_count: int
    due_count: int
