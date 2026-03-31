from pydantic import BaseModel


class ReviewMatrixItemResponse(BaseModel):
    step: str
    status: str
    note: str


class ReviewScoresResponse(BaseModel):
    logic: int
    academic: int
    consistency: int
    standard: int


class DimensionScoresResponse(BaseModel):
    logicAnalysis: int
    academicWriting: int
    consistency: int
    standardExecution: int
    researchDepth: int
    independentThinking: int


class ReviewResponse(BaseModel):
    id: str
    student_id: str
    assignment_id: str
    course_id: str
    student_name: str
    assignment_name: str
    course_title: str
    review_date: str
    title: str
    tag: str
    summary: str
    scores: ReviewScoresResponse
    dimension_scores: DimensionScoresResponse
    overall_comment: str
    academic_comment: str
    consistency_comment: str
    standard_comment: str
    suggestions: list[str]
    matrix: list[ReviewMatrixItemResponse]
    markdown_content: str
    markdown_path: str | None = None
    record_json_path: str | None = None
    report_html_path: str | None = None


class GrowthEntryResponse(BaseModel):
    review_id: str
    assignment_id: str
    assignment_name: str
    review_date: str
    tag: str
    dimension_scores: DimensionScoresResponse
    teacher_summary: str
    student_summary: str
