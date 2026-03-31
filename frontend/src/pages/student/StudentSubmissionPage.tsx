import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { useAuth } from "../../lib/auth-context";
import { getStudentAssignments, getStudentCourses, submitHomework } from "../../lib/mock-db";

interface SubmissionFeedback {
  fileName: string;
  submittedAt: string;
  statusText: string;
  nextHint: string;
}

export function StudentSubmissionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTimerRef = useRef<number | null>(null);

  const studentId = user?.studentId ?? "";
  const courses = getStudentCourses(studentId);
  const [courseId, setCourseId] = useState(searchParams.get("courseId") || courses[0]?.id || "");
  const assignments = useMemo(() => getStudentAssignments(studentId, courseId), [studentId, courseId]);
  const [assignmentId, setAssignmentId] = useState(searchParams.get("assignmentId") || "");
  const [file, setFile] = useState<File | null>(null);
  const [remark, setRemark] = useState("");
  const [alert, setAlert] = useState<{ type: "warn" | "ok"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);

  useEffect(() => {
    if (!assignments.length) {
      setAssignmentId("");
      return;
    }
    if (!assignments.some((assignment) => assignment.id === assignmentId)) {
      setAssignmentId(assignments[0].id);
    }
  }, [assignmentId, assignments]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  function resetForm() {
    const nextCourseId = courses[0]?.id || "";
    const nextAssignments = getStudentAssignments(studentId, nextCourseId);
    setCourseId(nextCourseId);
    setAssignmentId(nextAssignments[0]?.id || "");
    setFile(null);
    setRemark("");
    setAlert(null);
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!courseId || !assignmentId || !file) {
      setAlert({ type: "warn", message: "请先完整选择课程、作业，并上传作业文件。" });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      setAlert({ type: "ok", message: "文件已上传，系统正在提交并调用在线批改，请稍候。" });

      const submission = await submitHomework({
        studentId,
        assignmentId,
        courseId,
        fileName: file.name,
        file,
      });

      setFeedback({
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
        statusText: "批改中",
        nextHint: "系统已受理本次提交，5 秒后将自动返回学生首页。返回后，该作业会显示为“已提交”，并进入“作业批改中”状态。",
      });
      setAlert({
        type: "ok",
        message: "提交成功，系统已进入批改流程。",
      });

      redirectTimerRef.current = window.setTimeout(() => {
        navigate("/student");
      }, 5000);
    } catch (error) {
      setAlert({
        type: "warn",
        message: error instanceof Error ? error.message : "提交失败，请稍后重试。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="proto-narrow-wrap">
      <Breadcrumbs fallback={[{ label: "学生首页", to: "/student" }]} current="提交作业" />
      <div className="proto-form-panel">
        <div className="proto-eyebrow">Submission Portal</div>
        <h1 className="proto-title">提交作业</h1>
        <p className="proto-desc">
          页面只展示当前学生已纳入的课程。若从“我的作业 - 去提交作业”进入，课程与作业会自动带入；提交后系统会立即进入在线批改流程。
        </p>
        <div className="proto-actions">
          <Link className="proto-btn" to="/student">
            返回学生首页
          </Link>
        </div>

        {feedback ? (
          <section className="proto-submit-result">
            <div className="proto-submit-result-head">
              <h2>本次提交已成功受理</h2>
              <span className={`proto-status-pill ${feedback.statusText === "已完成批改" ? "good" : "mid"}`}>{feedback.statusText}</span>
            </div>
            <div className="proto-submit-result-grid">
              <div className="proto-submit-result-item">
                <span className="proto-submit-result-label">已提交文件名</span>
                <strong>{feedback.fileName}</strong>
              </div>
              <div className="proto-submit-result-item">
                <span className="proto-submit-result-label">提交时间</span>
                <strong>{feedback.submittedAt}</strong>
              </div>
              <div className="proto-submit-result-item">
                <span className="proto-submit-result-label">当前状态</span>
                <strong>{feedback.statusText}</strong>
              </div>
            </div>
            <p className="proto-muted">{feedback.nextHint}</p>
          </section>
        ) : null}

        <form className="proto-form" onSubmit={handleSubmit}>
          <div className="proto-field">
            <label>课程名称</label>
            <select
              value={courseId}
              onChange={(event) => {
                const nextCourseId = event.target.value;
                const nextAssignments = getStudentAssignments(studentId, nextCourseId);
                setCourseId(nextCourseId);
                setAssignmentId(nextAssignments[0]?.id || "");
              }}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="proto-field">
            <label>作业名称</label>
            <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </option>
              ))}
            </select>
            <div className="proto-muted">若从作业入口跳转，当前作业会自动选中；否则可在当前课程下手动选择。</div>
          </div>

          <div className="proto-field">
            <label>学生姓名</label>
            <input readOnly value={user?.name || ""} />
          </div>

          <div className="proto-field">
            <label>学号</label>
            <input readOnly value={studentId} />
          </div>

          <div className="proto-field">
            <label>上传作业</label>
            <input
              accept=".pdf,.doc,.docx,.ipynb,.md,.txt"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <div className="proto-muted">当前文件：{file?.name || "未选择文件"}</div>
          </div>

          <div className="proto-field">
            <label>备注说明</label>
            <textarea
              rows={5}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="可填写补充说明，例如重提版本、文件结构说明、补交原因等。"
            />
          </div>

          <div className="proto-actions">
            <button className="proto-btn primary" disabled={submitting} type="submit">
              {submitting ? "提交中…" : "提交"}
            </button>
            <button className="proto-btn" disabled={submitting} onClick={resetForm} type="button">
              清空
            </button>
          </div>
        </form>

        {alert ? <div className={`proto-alert ${alert.type}`}>{alert.message}</div> : null}
      </div>
    </div>
  );
}
