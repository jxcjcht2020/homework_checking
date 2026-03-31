export type Role = "teacher" | "student";

export interface SessionUser {
  role: Role;
  name: string;
  contact: string;
  workerId?: string;
  studentId?: string;
}

export interface UserRecord extends SessionUser {
  password: string;
}

export interface Level {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  levelId: string;
  name: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  major: string;
  className: string;
  contact: string;
  courseId: string;
}

export interface TeacherStudentListItem extends StudentProfile {
  courseName: string;
  levelId: string;
  levelName: string;
}

export interface StandardPreview {
  title: string;
  items: string[];
  paragraphs: string[];
}

export interface Assignment {
  id: string;
  name: string;
  levelId: string;
  courseId: string;
  createdAt: string;
  standardFileName: string;
  standardPreview: StandardPreview;
  collectionOpen: boolean;
  submittedCount: number;
  gradedCount: number;
}

export interface ReviewMatrixItem {
  step: string;
  status: "completed" | "partial" | "missing";
  note: string;
}

export interface ReviewScores {
  logic: number;
  academic: number;
  consistency: number;
  standard: number;
}

export interface DimensionScores {
  logicAnalysis: number;
  academicWriting: number;
  consistency: number;
  standardExecution: number;
  researchDepth: number;
  independentThinking: number;
}

export interface ReviewRecord {
  id: string;
  studentId: string;
  assignmentId: string;
  courseId: string;
  studentName: string;
  assignmentName: string;
  courseTitle: string;
  reviewDate: string;
  title: string;
  tag: string;
  summary: string;
  scores: ReviewScores;
  dimensionScores: DimensionScores;
  overallComment: string;
  academicComment: string;
  consistencyComment: string;
  standardComment: string;
  suggestions: string[];
  matrix: ReviewMatrixItem[];
  markdownContent: string;
}

export interface GrowthHistoryEntry {
  reviewId: string;
  assignmentId: string;
  assignmentName: string;
  reviewDate: string;
  tag: string;
  dimensionScores: DimensionScores;
  teacherSummary: string;
  studentSummary: string;
}

export interface SubmissionRecord {
  id: string;
  studentId: string;
  assignmentId: string;
  courseId: string;
  fileName: string;
  submittedAt: string;
  status?: string;
}

export interface AppDatabase {
  users: UserRecord[];
  levels: Level[];
  courses: Course[];
  students: StudentProfile[];
  assignments: Assignment[];
  reviews: ReviewRecord[];
  submissions: SubmissionRecord[];
}
