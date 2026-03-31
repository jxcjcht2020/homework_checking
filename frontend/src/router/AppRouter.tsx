import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { StudentLayout } from "../layouts/StudentLayout";
import { TeacherLayout } from "../layouts/TeacherLayout";
import { useAuth } from "../lib/auth-context";
import { LoginPage } from "../pages/auth/LoginPage";
import { PasswordResetPage } from "../pages/auth/PasswordResetPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { StudentHomePage } from "../pages/student/StudentHomePage";
import { StudentReviewPage } from "../pages/student/StudentReviewPage";
import { StudentSubmissionPage } from "../pages/student/StudentSubmissionPage";
import { AssignmentCreatePage } from "../pages/teacher/AssignmentCreatePage";
import { AssignmentDetailPage } from "../pages/teacher/AssignmentDetailPage";
import { AssignmentListPage } from "../pages/teacher/AssignmentListPage";
import { StudentGrowthPage } from "../pages/teacher/StudentGrowthPage";
import { StudentListPage } from "../pages/teacher/StudentListPage";
import { TeacherHomePage } from "../pages/teacher/TeacherHomePage";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="proto-wrap"><section className="proto-hero compact"><div className="proto-title">Loading…</div></section></div>;
  if (!user) return <Navigate replace to="/login" />;
  return <Navigate replace to={user.role === "teacher" ? "/" : "/student"} />;
}

function RequireRole({ role, children }: { role: "teacher" | "student"; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="proto-wrap"><section className="proto-hero compact"><div className="proto-title">Loading…</div></section></div>;
  if (!user) return <Navigate replace to="/login" />;
  if (user.role !== role) {
    return <Navigate replace to={user.role === "teacher" ? "/" : "/student"} />;
  }
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="proto-wrap"><section className="proto-hero compact"><div className="proto-title">Loading…</div></section></div>;
  if (!user) return <>{children}</>;
  return <Navigate replace to={user.role === "teacher" ? "/" : "/student"} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/password-reset"
        element={
          <PublicOnly>
            <PasswordResetPage />
          </PublicOnly>
        }
      />

      <Route
        path="/"
        element={
          <RequireRole role="teacher">
            <TeacherLayout />
          </RequireRole>
        }
      >
        <Route index element={<TeacherHomePage />} />
        <Route path="teacher/students" element={<StudentListPage />} />
        <Route path="teacher/assignments" element={<AssignmentListPage />} />
        <Route path="teacher/assignments/new" element={<AssignmentCreatePage />} />
        <Route path="teacher/assignments/:assignmentId" element={<AssignmentDetailPage />} />
        <Route path="teacher/courses/:courseId/students/:studentId/growth" element={<StudentGrowthPage />} />
      </Route>

      <Route
        path="/student"
        element={
          <RequireRole role="student">
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route index element={<StudentHomePage />} />
        <Route path="reviews" element={<StudentReviewPage />} />
        <Route path="submissions/new" element={<StudentSubmissionPage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
