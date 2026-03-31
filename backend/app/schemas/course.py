from pydantic import BaseModel

from app.schemas.common import ORMModel


class LevelResponse(ORMModel):
    id: str
    name: str


class CourseResponse(ORMModel):
    id: str
    level_id: str
    name: str


class CreateCourseRequest(BaseModel):
    level_id: str
    name: str


class StudentCreateRequest(BaseModel):
    name: str
    student_id: str
    major: str
    class_name: str
    contact: str
    password: str = "Test@123"


class StudentImportRequest(BaseModel):
    raw_text: str


class StudentResponse(BaseModel):
    id: str
    name: str
    major: str
    class_name: str
    contact: str
    course_id: str


class TeacherStudentListItemResponse(BaseModel):
    id: str
    name: str
    major: str
    class_name: str
    contact: str
    course_id: str
    course_name: str
    level_id: str
    level_name: str
