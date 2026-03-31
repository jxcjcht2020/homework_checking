import { evaluationDirections, standardSteps } from "../mock/seed";
import type {
  Assignment,
  Course,
  GrowthHistoryEntry,
  Level,
  ReviewRecord,
  SessionUser,
  StudentProfile,
  TeacherStudentListItem,
  SubmissionRecord,
} from "../types/domain";
import { readStorage, writeStorage } from "./storage";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://127.0.0.1:8000/api";
const TOKEN_KEY = "homework_platform_access_token";
const USER_KEY = "homework_platform_session_user";

type TeacherAssignment = Assignment & { courseName?: string; levelName?: string; dueCount?: number };
type StudentAssignment = Assignment & {
  courseName: string;
  status: string;
  submission?: SubmissionRecord | null;
  review?: ReviewRecord | null;
};

interface BackendCache {
  user: SessionUser | null;
  token: string;
  levels: Level[];
  courses: Course[];
  studentsByCourse: Record<string, StudentProfile[]>;
  teacherStudents: TeacherStudentListItem[];
  assignments: TeacherAssignment[];
  submissions: SubmissionRecord[];
  reviewsByAssignment: Record<string, ReviewRecord[]>;
  studentProfile: StudentProfile | null;
  studentCourses: Course[];
  studentAssignments: StudentAssignment[];
  studentGrowth: GrowthHistoryEntry[];
}

const cache: BackendCache = {
  user: readStorage<SessionUser | null>(USER_KEY, null),
  token: readStorage<string>(TOKEN_KEY, ""),
  levels: [],
  courses: [],
  studentsByCourse: {},
  teacherStudents: [],
  assignments: [],
  submissions: [],
  reviewsByAssignment: {},
  studentProfile: null,
  studentCourses: [],
  studentAssignments: [],
  studentGrowth: [],
};

function persistSession() {
  if (cache.token) {
    writeStorage(TOKEN_KEY, cache.token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (cache.user) {
    writeStorage(USER_KEY, cache.user);
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function clearDataCache() {
  cache.levels = [];
  cache.courses = [];
  cache.studentsByCourse = {};
  cache.teacherStudents = [];
  cache.assignments = [];
  cache.submissions = [];
  cache.reviewsByAssignment = {};
  cache.studentProfile = null;
  cache.studentCourses = [];
  cache.studentAssignments = [];
  cache.studentGrowth = [];
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!(init.body instanceof FormData) && !headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (cache.token) {
    headers.set("Authorization", `Bearer ${cache.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = "Request failed.";
    try {
      const data = await response.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function mapSessionUser(input: any): SessionUser {
  return {
    role: input.role,
    name: input.name,
    contact: input.contact,
    workerId: input.worker_id ?? input.workerId,
    studentId: input.student_id ?? input.studentId,
  };
}

function mapLevel(input: any): Level {
  const names: Record<string, string> = {
    undergraduate: "本科生",
    graduate: "硕士生",
    doctor: "博士生",
  };
  return { id: input.id, name: names[input.id] ?? input.name };
}

function mapCourse(input: any): Course {
  return { id: input.id, levelId: input.level_id ?? input.levelId, name: input.name };
}

function mapStudent(input: any): StudentProfile {
  return {
    id: input.id,
    name: input.name,
    major: input.major,
    className: input.class_name ?? input.className,
    contact: input.contact,
    courseId: input.course_id ?? input.courseId,
  };
}

function mapTeacherStudentListItem(input: any): TeacherStudentListItem {
  return {
    id: input.id,
    name: input.name,
    major: input.major,
    className: input.class_name ?? input.className,
    contact: input.contact,
    courseId: input.course_id ?? input.courseId,
    courseName: input.course_name ?? input.courseName,
    levelId: input.level_id ?? input.levelId,
    levelName: input.level_name ?? input.levelName,
  };
}

function mapSubmission(input: any): SubmissionRecord {
  return {
    id: input.id,
    studentId: input.student_id ?? input.studentId,
    assignmentId: input.assignment_id ?? input.assignmentId,
    courseId: input.course_id ?? input.courseId,
    fileName: input.file_name ?? input.fileName,
    submittedAt: input.submitted_at ?? input.submittedAt,
    status: input.status,
  };
}

function mapReview(input: any): ReviewRecord {
  return {
    id: input.id,
    studentId: input.student_id ?? input.studentId,
    assignmentId: input.assignment_id ?? input.assignmentId,
    courseId: input.course_id ?? input.courseId,
    studentName: input.student_name ?? input.studentName,
    assignmentName: input.assignment_name ?? input.assignmentName,
    courseTitle: input.course_title ?? input.courseTitle,
    reviewDate: input.review_date ?? input.reviewDate,
    title: input.title,
    tag: input.tag,
    summary: input.summary,
    scores: input.scores,
    dimensionScores: input.dimension_scores ?? input.dimensionScores,
    overallComment: input.overall_comment ?? input.overallComment,
    academicComment: input.academic_comment ?? input.academicComment,
    consistencyComment: input.consistency_comment ?? input.consistencyComment,
    standardComment: input.standard_comment ?? input.standardComment,
    suggestions: input.suggestions ?? [],
    matrix: input.matrix ?? [],
    markdownContent: input.markdown_content ?? input.markdownContent ?? "",
  };
}

function mapAssignment(input: any): TeacherAssignment {
  return {
    id: input.id,
    name: input.name,
    levelId: input.level_id ?? input.levelId,
    courseId: input.course_id ?? input.courseId,
    createdAt: input.created_at ?? input.createdAt,
    standardFileName: input.standard_file_name ?? input.standardFileName,
    standardPreview: input.standard_preview ?? input.standardPreview ?? { title: "", items: [], paragraphs: [] },
    collectionOpen: input.collection_open ?? input.collectionOpen,
    submittedCount: input.submitted_count ?? input.submittedCount ?? 0,
    gradedCount: input.graded_count ?? input.gradedCount ?? 0,
    courseName: input.course_name ?? input.courseName,
    levelName: input.level_name ?? input.levelName,
    dueCount: input.due_count ?? input.dueCount,
  };
}

function mapStudentAssignment(input: any): StudentAssignment {
  return {
    id: input.id,
    name: input.name,
    levelId: input.level_id ?? input.levelId,
    courseId: input.course_id ?? input.courseId,
    createdAt: input.created_at ?? input.createdAt,
    standardFileName: input.standard_file_name ?? input.standardFileName,
    standardPreview: input.standard_preview ?? input.standardPreview ?? { title: "", items: [], paragraphs: [] },
    collectionOpen: input.collection_open ?? input.collectionOpen,
    submittedCount: input.submitted_count ?? input.submittedCount ?? 0,
    gradedCount: input.graded_count ?? input.gradedCount ?? 0,
    courseName: input.course_name ?? input.courseName ?? "",
    status: input.status ?? "未提交",
    submission: input.submission ? mapSubmission(input.submission) : null,
    review: input.review ? mapReview(input.review) : null,
  };
}

function mapGrowth(input: any): GrowthHistoryEntry {
  return {
    reviewId: input.review_id ?? input.reviewId,
    assignmentId: input.assignment_id ?? input.assignmentId,
    assignmentName: input.assignment_name ?? input.assignmentName,
    reviewDate: input.review_date ?? input.reviewDate,
    tag: input.tag,
    dimensionScores: input.dimension_scores ?? input.dimensionScores,
    teacherSummary: input.teacher_summary ?? input.teacherSummary,
    studentSummary: input.student_summary ?? input.studentSummary,
  };
}

async function bootstrapTeacherData() {
  const [levels, courses, assignments, submissions] = await Promise.all([
    api<any[]>("/levels"),
    api<any[]>("/courses"),
    api<any[]>("/assignments"),
    api<any[]>("/submissions"),
  ]);

  cache.levels = levels.map(mapLevel);
  cache.courses = courses.map(mapCourse);
  cache.assignments = assignments.map(mapAssignment);
  cache.submissions = submissions.map(mapSubmission);

  const studentEntries = await Promise.all(
    cache.courses.map(async (course) => [course.id, (await api<any[]>(`/courses/${course.id}/students`)).map(mapStudent)] as const),
  );
  cache.studentsByCourse = Object.fromEntries(studentEntries);
  cache.teacherStudents = (await api<any[]>("/students")).map(mapTeacherStudentListItem);

  const reviewEntries = await Promise.all(
    cache.assignments.map(async (assignment) => [
      assignment.id,
      (await api<any[]>(`/assignments/${assignment.id}/reviews`)).map(mapReview),
    ] as const),
  );
  cache.reviewsByAssignment = Object.fromEntries(reviewEntries);
}

async function bootstrapStudentData() {
  const [profile, courses, assignments, growth] = await Promise.all([
    api<any>("/students/me/profile"),
    api<any[]>("/students/me/courses"),
    api<any[]>("/students/me/assignments"),
    api<any[]>("/students/me/growth"),
  ]);

  cache.studentProfile = mapStudent({
    ...profile,
    course_id: courses[0]?.id ?? "",
  });
  cache.studentCourses = courses.map(mapCourse);
  cache.studentAssignments = assignments.map(mapStudentAssignment);
  cache.studentGrowth = growth.map(mapGrowth);
}

async function bootstrapForCurrentUser() {
  clearDataCache();
  if (!cache.user) return;
  if (cache.user.role === "teacher") {
    await bootstrapTeacherData();
  } else {
    await bootstrapStudentData();
  }
}

export function getCurrentUser() {
  return cache.user;
}

export async function refreshSession() {
  if (!cache.token) {
    cache.user = null;
    persistSession();
    return null;
  }
  try {
    const user = mapSessionUser(await api<any>("/auth/me"));
    cache.user = user;
    persistSession();
    await bootstrapForCurrentUser();
    return user;
  } catch {
    cache.user = null;
    cache.token = "";
    persistSession();
    clearDataCache();
    return null;
  }
}

export async function login(role: "teacher" | "student", id: string, password: string) {
  try {
    const result = await api<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ role, identifier: id, password }),
    });
    cache.token = result.access_token;
    cache.user = mapSessionUser(result.user);
    persistSession();
    await bootstrapForCurrentUser();
    return { ok: true as const, user: cache.user };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "登录失败。" };
  }
}

export async function register(payload: {
  role: "teacher" | "student";
  name: string;
  id: string;
  contact: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        role: payload.role,
        name: payload.name,
        identifier: payload.id,
        contact: payload.contact,
        password: payload.password,
        confirm_password: payload.confirmPassword,
      }),
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "注册失败。" };
  }
}

export async function updatePassword(payload: {
  role: "teacher" | "student";
  id: string;
  contact: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    await api("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({
        role: payload.role,
        identifier: payload.id,
        contact: payload.contact,
        password: payload.password,
        confirm_password: payload.confirmPassword,
      }),
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "密码重置失败。" };
  }
}

export function logout() {
  cache.token = "";
  cache.user = null;
  persistSession();
  clearDataCache();
}

export function getEvaluationDirections() {
  return evaluationDirections;
}

export function getStandardSteps() {
  return standardSteps;
}

export function listLevels() {
  const order = ["undergraduate", "graduate", "doctor"];
  return [...cache.levels].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function listCourses(levelId?: string) {
  return levelId ? cache.courses.filter((item) => item.levelId === levelId) : cache.courses;
}

export function getCourse(courseId: string) {
  return cache.courses.find((item) => item.id === courseId) ?? cache.studentCourses.find((item) => item.id === courseId) ?? null;
}

export async function addCourse(payload: { levelId: string; name: string }) {
  const course = mapCourse(
    await api<any>("/courses", {
      method: "POST",
      body: JSON.stringify({ level_id: payload.levelId, name: payload.name }),
    }),
  );
  cache.courses = [course, ...cache.courses];
  return course;
}

export function listStudents(courseId: string) {
  return cache.studentsByCourse[courseId] ?? [];
}

export function getStudent(courseId: string, studentId: string) {
  return listStudents(courseId).find((item) => item.id === studentId) ?? null;
}

export function getStudentProfile(studentId: string) {
  if (cache.studentProfile?.id === studentId) return cache.studentProfile;
  const student = Object.values(cache.studentsByCourse).flat().find((item) => item.id === studentId);
  return student ?? null;
}

export async function addStudent(courseId: string, payload: Omit<StudentProfile, "courseId">) {
  await api(`/courses/${courseId}/students`, {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      student_id: payload.id,
      major: payload.major,
      class_name: payload.className,
      contact: payload.contact,
      password: "Test@123",
    }),
  });
  cache.studentsByCourse[courseId] = (await api<any[]>(`/courses/${courseId}/students`)).map(mapStudent);
  cache.teacherStudents = (await api<any[]>("/students")).map(mapTeacherStudentListItem);
}

export async function importStudents(courseId: string, rawText: string) {
  const result = await api<{ count: number }>(`/courses/${courseId}/students/import`, {
    method: "POST",
    body: JSON.stringify({ raw_text: rawText }),
  });
  cache.studentsByCourse[courseId] = (await api<any[]>(`/courses/${courseId}/students`)).map(mapStudent);
  cache.teacherStudents = (await api<any[]>("/students")).map(mapTeacherStudentListItem);
  return result.count;
}

export async function listTeacherStudents(filters?: {
  levelId?: string;
  courseId?: string;
  keyword?: string;
}) {
  const search = new URLSearchParams();
  if (filters?.levelId) search.set("level_id", filters.levelId);
  if (filters?.courseId) search.set("course_id", filters.courseId);
  if (filters?.keyword?.trim()) search.set("keyword", filters.keyword.trim());
  const path = `/students${search.toString() ? `?${search.toString()}` : ""}`;
  cache.teacherStudents = (await api<any[]>(path)).map(mapTeacherStudentListItem);
  return cache.teacherStudents;
}

export function getTeacherStudentsCache() {
  return cache.teacherStudents;
}

export function listAssignments(courseId?: string) {
  return courseId ? cache.assignments.filter((item) => item.courseId === courseId) : cache.assignments;
}

export function getAssignment(assignmentId: string) {
  return cache.assignments.find((item) => item.id === assignmentId) ?? null;
}

export async function createAssignment(payload: {
  name: string;
  levelId: string;
  courseId: string;
  createdAt: string;
  standardFileName: string;
  standardPreview: { title: string; items: string[]; paragraphs: string[] };
  collectionOpen: boolean;
  standardFile?: File | null;
}) {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("level_id", payload.levelId);
  form.append("course_id", payload.courseId);
  form.append("created_at", payload.createdAt);
  form.append("collection_open", String(payload.collectionOpen));
  form.append("standard_file_name", payload.standardFileName);
  form.append("preview_title", payload.standardPreview.title);
  form.append("preview_items_text", payload.standardPreview.items.join("\n"));
  form.append("preview_paragraphs_text", payload.standardPreview.paragraphs.join("\n"));
  if (payload.standardFile) {
    form.append("standard_file", payload.standardFile, payload.standardFile.name);
  }
  await api("/assignments", { method: "POST", body: form });
  cache.assignments = (await api<any[]>("/assignments")).map(mapAssignment);
}

export async function updateAssignment(
  assignmentId: string,
  payload: Partial<Assignment> & {
    standardFileName?: string;
    standardPreview?: { title: string; items: string[]; paragraphs: string[] };
    standardFile?: File | null;
  },
) {
  const form = new FormData();
  if (payload.name != null) form.append("name", payload.name);
  if (payload.levelId != null) form.append("level_id", payload.levelId);
  if (payload.courseId != null) form.append("course_id", payload.courseId);
  if (payload.createdAt != null) form.append("created_at", payload.createdAt);
  if (payload.collectionOpen != null) form.append("collection_open", String(payload.collectionOpen));
  if (payload.standardFileName != null) form.append("standard_file_name", payload.standardFileName);
  if (payload.standardPreview) {
    form.append("preview_title", payload.standardPreview.title);
    form.append("preview_items_text", payload.standardPreview.items.join("\n"));
    form.append("preview_paragraphs_text", payload.standardPreview.paragraphs.join("\n"));
  }
  if (payload.standardFile) {
    form.append("standard_file", payload.standardFile, payload.standardFile.name);
  }
  await api(`/assignments/${assignmentId}`, { method: "PATCH", body: form });
  cache.assignments = (await api<any[]>("/assignments")).map(mapAssignment);
}

export async function toggleAssignmentCollection(assignmentId: string) {
  await api(`/assignments/${assignmentId}/toggle-collection`, { method: "POST" });
  cache.assignments = (await api<any[]>("/assignments")).map(mapAssignment);
}

export async function deleteAssignment(assignmentId: string) {
  await api(`/assignments/${assignmentId}`, { method: "DELETE" });
  cache.assignments = cache.assignments.filter((item) => item.id !== assignmentId);
  delete cache.reviewsByAssignment[assignmentId];
  cache.submissions = cache.submissions.filter((item) => item.assignmentId !== assignmentId);
}

export function listReviews() {
  return Object.values(cache.reviewsByAssignment).flat();
}

export function listReviewsByAssignment(assignmentId: string) {
  return cache.reviewsByAssignment[assignmentId] ?? [];
}

export function getReview(reviewId: string) {
  return listReviews().find((item) => item.id === reviewId) ?? null;
}

export function findReview(studentId: string, assignmentId: string) {
  return cache.studentAssignments.find((item) => item.id === assignmentId && item.review)?.review ?? listReviewsByAssignment(assignmentId).find((item) => item.studentId === studentId) ?? null;
}

export function listSubmissions() {
  return cache.submissions;
}

export async function submitHomework(payload: Omit<SubmissionRecord, "id" | "submittedAt"> & { file: File }) {
  const form = new FormData();
  form.append("assignment_id", payload.assignmentId);
  form.append("course_id", payload.courseId);
  form.append("file", payload.file, payload.fileName);
  const submission = mapSubmission(await api<any>("/submissions", { method: "POST", body: form }));
  await bootstrapStudentData();
  return submission;
}

export function seedDemoReview() {
  return;
}

export function getStudentCourses(studentId: string) {
  if (cache.user?.studentId === studentId) return cache.studentCourses;
  const courseIds = new Set(Object.entries(cache.studentsByCourse).filter(([, students]) => students.some((student) => student.id === studentId)).map(([courseId]) => courseId));
  return cache.courses.filter((course) => courseIds.has(course.id));
}

export function getStudentAssignments(studentId: string, courseId?: string) {
  if (cache.user?.studentId === studentId) {
    return courseId ? cache.studentAssignments.filter((item) => item.courseId === courseId) : cache.studentAssignments;
  }
  return [];
}

export function getStudentGrowth(studentId: string) {
  if (cache.user?.studentId === studentId) return cache.studentGrowth;
  const history = listReviews()
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => String(a.reviewDate).localeCompare(String(b.reviewDate)))
    .map<GrowthHistoryEntry>((item) => ({
      reviewId: item.id,
      assignmentId: item.assignmentId,
      assignmentName: item.assignmentName,
      reviewDate: item.reviewDate,
      tag: item.tag,
      dimensionScores: item.dimensionScores,
      teacherSummary: item.summary,
      studentSummary: item.suggestions[0] ?? item.summary,
    }));
  return history;
}

export function getDashboardSnapshot() {
  return {
    levelCount: cache.levels.length,
    courseCount: cache.courses.length,
    studentCount: Object.values(cache.studentsByCourse).flat().length,
    assignmentCount: cache.assignments.length,
  };
}
