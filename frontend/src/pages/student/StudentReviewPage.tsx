import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { useAuth } from "../../lib/auth-context";
import { findReview, getEvaluationDirections, getStudentAssignments, getStudentCourses } from "../../lib/mock-db";

const scoreLabels = [
  ["logic", "整体逻辑与结论"],
  ["academic", "学术化语言表达"],
  ["consistency", "前文分析与结论一致性"],
  ["standard", "专业标准执行"],
] as const;

export function StudentReviewPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const studentId = user?.studentId ?? "";
  const courses = getStudentCourses(studentId);
  const studentName = user?.name || "";
  const [courseId, setCourseId] = useState(searchParams.get("courseId") || courses[0]?.id || "");
  const assignments = useMemo(() => getStudentAssignments(studentId, courseId), [studentId, courseId]);
  const [assignmentId, setAssignmentId] = useState(searchParams.get("assignmentId") || "");
  const [queried, setQueried] = useState(false);
  const shouldAutoQuery = Boolean(searchParams.get("assignmentId"));

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
    if (!shouldAutoQuery || !assignmentId) return;
    if (!assignments.some((assignment) => assignment.id === assignmentId)) return;
    setQueried(true);
  }, [assignmentId, assignments, shouldAutoQuery]);

  const selectedAssignment = assignments.find((item) => item.id === assignmentId) || null;
  const review = assignmentId ? findReview(studentId, assignmentId) : null;
  const directions = getEvaluationDirections();

  function downloadMarkdown() {
    if (!review) return;
    const blob = new Blob([review.markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${review.studentName}_${review.assignmentName}_作业评语.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function resetView() {
    const nextCourseId = courses[0]?.id || "";
    const nextAssignments = getStudentAssignments(studentId, nextCourseId);
    setCourseId(nextCourseId);
    setAssignmentId(nextAssignments[0]?.id || "");
    setQueried(false);
  }

  return (
    <div className="proto-student-query-wrap">
      <Breadcrumbs fallback={[{ label: "学生首页", to: "/student" }]} current="作业批改查询" />
      <section className="proto-hero compact">
        <div className="proto-hero-top">
          <div>
            <div className="proto-eyebrow">Student Portal</div>
            <h1 className="proto-title">作业批改查询</h1>
          </div>
          <div className="proto-actions">
            <button className="proto-btn primary" disabled={!review} onClick={downloadMarkdown} type="button">
              下载批改结果
            </button>
            <Link className="proto-btn" to="/student/submissions/new">
              提交作业
            </Link>
          </div>
        </div>
        <p className="proto-desc">
          查询页采用“课程 + 作业”两级筛选，而不是为每一次新作业单独生成页面。这样可以直接承接教师端的新建课程、新建作业，也能保持学生端入口结构稳定。
        </p>
        <div className="proto-query-bar">
          <input
            className="proto-query-name"
            value={studentName}
            placeholder="学生姓名"
            readOnly
            type="text"
          />
          <select
            className="proto-query-course"
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
          <select className="proto-query-assignment" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.name}
              </option>
            ))}
          </select>
          <button className="proto-btn primary proto-query-action" onClick={() => setQueried(true)} type="button">
            查询
          </button>
          <button className="proto-btn proto-query-reset" onClick={resetView} type="button">
            重置
          </button>
        </div>
        <div className="proto-query-caption">查询仅限当前登录学生本人；课程下拉已限定为本人所属课程，作业下拉会随课程自动联动更新。</div>
      </section>

      <section className="proto-section-card proto-section-card-compact">
        <h2 style={{ marginBottom: 16 }}>评价标准</h2>
        <div className="proto-grid-2">
          <div className="proto-criteria-panel">
            <h3>本次批改的四个评价方向</h3>
            <ul>
              {directions.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>：{item.description}
                </li>
              ))}
            </ul>
          </div>
          <div className="proto-criteria-panel">
            <h3>{selectedAssignment?.standardPreview.title || "主链条"}</h3>
            {selectedAssignment?.standardPreview.items?.length ? (
              <ul>
                {selectedAssignment.standardPreview.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {selectedAssignment?.standardPreview.paragraphs?.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="proto-section-card proto-section-card-compact">
        <h2 style={{ marginBottom: 16 }}>学生评语卡片</h2>
        {queried ? (
          review ? (
            <div className="proto-review-card proto-review-card-tight">
              <div className="proto-student-head">
                <div>
                  <div className="proto-student-name">{review.studentName}</div>
                  <div className="proto-student-topic">题目：{review.title}</div>
                </div>
                <div className="proto-tag">{review.tag}</div>
              </div>
              <div className="proto-result-meta-row">
                <span className="proto-mini-chip">{selectedAssignment?.courseName || "当前课程"}</span>
                <span className="proto-mini-chip">{selectedAssignment?.name || "当前作业"}</span>
                <span className="proto-mini-chip">批改时间 {review.reviewDate}</span>
              </div>
              <div className="proto-score-grid">
                {scoreLabels.map(([key, label]) => (
                  <div className="proto-score-line" key={key}>
                    <div className="proto-score-head">
                      <span>{label}</span>
                      <span>{review.scores[key]} / 100</span>
                    </div>
                    <div className="proto-score-bar">
                      <div className="proto-score-fill" style={{ width: `${review.scores[key]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="proto-comment-block">
                <div className="proto-comment-item">
                  <h4>整体评价</h4>
                  <p>{review.overallComment}</p>
                </div>
                <div className="proto-comment-item">
                  <h4>学术化语言评价</h4>
                  <p>{review.academicComment}</p>
                </div>
                <div className="proto-comment-item">
                  <h4>前文分析与结论一致性</h4>
                  <p>{review.consistencyComment}</p>
                </div>
                <div className="proto-comment-item">
                  <h4>按照分析标准的专业评价</h4>
                  <p>{review.standardComment}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="proto-fallback">
              <strong>当前未检索到该作业的批改结果。</strong>
              <br />
              若尚未提交，可前往
              <Link to={`/student/submissions/new?courseId=${courseId}&assignmentId=${assignmentId}`}> 提交作业 </Link>
              。
            </div>
          )
        ) : (
          <div className="proto-fallback">当前查询仅针对你的账号开放。选择课程与作业后，即可查看本人批改结果。</div>
        )}
      </section>

      {queried && review ? (
        <>
          <section className="proto-section-card proto-section-card-compact">
            <h2 style={{ marginBottom: 16 }}>标准执行矩阵</h2>
            <div className="proto-matrix-shell">
              <table className="proto-single-matrix">
                <thead>
                  <tr>
                    <th>标准步骤</th>
                    <th>{review.studentName}</th>
                  </tr>
                </thead>
                <tbody>
                  {review.matrix.map((item) => (
                    <tr key={item.step}>
                      <td>{item.step}</td>
                      <td>
                        <div className={`proto-status-pill-matrix ${item.status}`}>
                          {item.status === "completed" ? "完成" : item.status === "partial" ? "部分完成" : "缺失"}
                        </div>
                        <div className="proto-note">{item.note}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="proto-section-card proto-section-card-compact">
            <h2 style={{ marginBottom: 16 }}>后续提升方向</h2>
            <ul className="proto-improve-list">
              {review.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
