import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { getBreadcrumbTrail } from "../../lib/navigation";
import { getAssignment, getCourse, getEvaluationDirections, listReviewsByAssignment, listStudents } from "../../lib/mock-db";

type SortField = "average" | "logic" | "academic" | "consistency" | "standard";

export function AssignmentDetailPage() {
  const location = useLocation();
  const { assignmentId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const assignment = getAssignment(assignmentId);
  const directions = getEvaluationDirections();
  const [sortField, setSortField] = useState<SortField>("average");
  const [keyword, setKeyword] = useState("");
  const focusStudentId = searchParams.get("studentId") || "";
  const trail = getBreadcrumbTrail(location.state);
  const backTo = trail.length ? trail[trail.length - 1].to : "/teacher/assignments";

  const reviews = useMemo(() => {
    const rows = listReviewsByAssignment(assignmentId).map((review) => ({
      ...review,
      average:
        (review.scores.logic + review.scores.academic + review.scores.consistency + review.scores.standard) / 4,
    }));
    const getFieldValue = (row: (typeof rows)[number]) => {
      if (sortField === "average") return row.average;
      if (sortField === "logic") return row.scores.logic;
      if (sortField === "academic") return row.scores.academic;
      if (sortField === "consistency") return row.scores.consistency;
      return row.scores.standard;
    };
    const normalizedKeyword = keyword.trim();
    const filtered = rows.filter((row) => {
      if (focusStudentId && row.studentId !== focusStudentId) return false;
      if (!normalizedKeyword) return true;
      return (
        row.studentName.includes(normalizedKeyword) ||
        row.title.includes(normalizedKeyword) ||
        row.tag.includes(normalizedKeyword)
      );
    });
    return filtered.sort((a, b) => getFieldValue(b) - getFieldValue(a));
  }, [assignmentId, focusStudentId, keyword, sortField]);

  if (!assignment) {
    return (
      <div className="proto-wrap">
        <Breadcrumbs fallback={[{ label: "教师首页", to: "/" }, { label: "作业列表", to: "/teacher/assignments" }]} current="作业详情" />
        <section className="proto-hero compact">
          <div className="proto-eyebrow">Assignment Detail</div>
          <h1 className="proto-title">未找到对应作业</h1>
          <div className="proto-actions">
            <Link className="proto-btn" to="/teacher/assignments">
              返回作业列表
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const dueCount = listStudents(assignment.courseId).length;
  const unsubmitted = dueCount - assignment.submittedCount;
  const gradedRatio = dueCount ? Math.round((assignment.gradedCount / dueCount) * 100) : 0;
  const course = getCourse(assignment.courseId);

  return (
    <div className="proto-wrap">
      <Breadcrumbs
        fallback={[
          { label: "教师首页", to: "/" },
          { label: "作业列表", to: "/teacher/assignments" },
        ]}
        current="作业详情"
      />

      <section className="proto-hero compact">
        <div className="proto-eyebrow">Assignment Detail</div>
        <h1 className="proto-title">{assignment.name}</h1>
        <p className="proto-desc">
          {assignment.standardPreview.paragraphs[0] ||
            "当前作业已接入标准文件预览，可进一步扩展为后端返回的 Markdown 首标题内容。"}
        </p>
        <div className="proto-result-meta-row">
          <span className="proto-mini-chip">课程 {course?.name || assignment.courseId}</span>
          <span className="proto-mini-chip">标准文件 {assignment.standardFileName || "未记录"}</span>
          <span className="proto-mini-chip">{assignment.collectionOpen ? "当前收集中" : "当前未收集"}</span>
        </div>
        <div className="proto-actions">
          <Link className="proto-btn" to={backTo}>
            返回上一页
          </Link>
        </div>
      </section>

      <section className="proto-section-card">
        <div className="proto-info-strip proto-info-strip-detail">
          <div className="proto-info-box">
            <div className="proto-info-label">应交人数</div>
            <div className="proto-info-value">{dueCount}</div>
          </div>
          <div className="proto-info-box">
            <div className="proto-info-label">已交人数</div>
            <div className="proto-info-value">{assignment.submittedCount}</div>
          </div>
          <div className="proto-info-box">
            <div className="proto-info-label">未交人数</div>
            <div className="proto-info-value">{unsubmitted}</div>
          </div>
          <div className="proto-info-box">
            <div className="proto-info-label">批改完成率</div>
            <div className="proto-info-value">{gradedRatio}%</div>
          </div>
        </div>
      </section>

      <section className="proto-section-card">
        <div className="proto-section-head">
          <div>
            <h2>批改总览</h2>
            <div className="proto-muted">
              {focusStudentId ? "当前展示从成长路径回溯进入的学生详情。" : "支持按姓名、标签或题目关键词检索，并按平均总分或任意分项排序。"}
            </div>
          </div>
          <div className="proto-search-box">
            <input
              className="proto-search-input"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索学生姓名、标签或题目"
              type="search"
              value={keyword}
            />
          </div>
        </div>
        <div className="proto-toolbar">
          <div className="proto-hint">当前共展示 {reviews.length} 份批改结果，卡片区与下方矩阵保持同一学生顺序。</div>
          <div className="proto-segment">
            <button className={sortField === "average" ? "active" : ""} onClick={() => setSortField("average")} type="button">
              平均总分
            </button>
            <button className={sortField === "logic" ? "active" : ""} onClick={() => setSortField("logic")} type="button">
              逻辑
            </button>
            <button className={sortField === "academic" ? "active" : ""} onClick={() => setSortField("academic")} type="button">
              学术表达
            </button>
            <button className={sortField === "consistency" ? "active" : ""} onClick={() => setSortField("consistency")} type="button">
              一致性
            </button>
            <button className={sortField === "standard" ? "active" : ""} onClick={() => setSortField("standard")} type="button">
              标准执行
            </button>
          </div>
        </div>

        {reviews.length ? (
          <div className="proto-assignment-grid proto-review-grid-detail">
            {reviews.map((review) => (
              <div className="proto-review-card" key={review.id}>
                <div className="proto-student-head">
                  <div>
                    <div className="proto-student-name" style={{ fontSize: 22 }}>
                      {review.studentName}
                    </div>
                    <div className="proto-student-topic">{review.tag}</div>
                  </div>
                  <div className="proto-tag">均值 {Math.round(review.average)}</div>
                </div>
                <p className="proto-desc" style={{ marginTop: 0, maxWidth: "none" }}>
                  {review.summary}
                </p>
                <div className="proto-score-grid proto-score-grid-compact">
                  {[
                    ["逻辑", review.scores.logic],
                    ["学术", review.scores.academic],
                    ["一致性", review.scores.consistency],
                    ["标准", review.scores.standard],
                  ].map(([label, value]) => (
                    <div className="proto-score-line" key={label}>
                      <div className="proto-score-head">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                      <div className="proto-score-bar">
                        <div className="proto-score-fill" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="proto-empty">当前筛选条件下没有匹配的批改结果。</div>
        )}
      </section>

      <section className="proto-section-card">
        <h2 style={{ marginBottom: 16 }}>评价标准</h2>
        <div className="proto-grid-2">
          <div className="proto-criteria-panel">
            {directions.map((item) => (
              <div key={item.title} style={{ marginBottom: 14 }}>
                <h3 style={{ marginBottom: 6 }}>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
          <div className="proto-criteria-panel">
            <h3>{assignment.standardPreview.title}</h3>
            <ul>
              {assignment.standardPreview.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {assignment.standardPreview.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="proto-section-card">
        <h2 style={{ marginBottom: 16 }}>标准执行矩阵</h2>
        {reviews.length ? (
          <div className="proto-matrix-shell">
            <div className="proto-matrix-scroll">
              <table className="proto-single-matrix proto-single-matrix-wide">
                <thead>
                  <tr>
                    <th>标准步骤</th>
                    {reviews.map((review) => (
                      <th key={review.id}>{review.studentName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignment.standardPreview.items.map((step, index) => (
                    <tr key={step}>
                      <td>{step}</td>
                      {reviews.map((review) => {
                        const record = review.matrix[index];
                        return (
                          <td key={review.id + step}>
                            <div className={`proto-status-pill-matrix ${record?.status || "missing"}`}>
                              {record?.status === "completed" ? "完成" : record?.status === "partial" ? "部分完成" : "缺失"}
                            </div>
                            <div className="proto-note">{record?.note || "暂无说明"}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="proto-empty">暂无可展示的矩阵结果。</div>
        )}
      </section>
    </div>
  );
}
