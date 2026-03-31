import { useLocation } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { createBreadcrumbState } from "../../lib/navigation";
import { deleteAssignment, listAssignments, listStudents, listSubmissions, toggleAssignmentCollection } from "../../lib/mock-db";

function getAssignmentStats(assignmentId: string, courseId: string) {
  const courseStudents = listStudents(courseId);
  const submissions = listSubmissions().filter((item) => item.assignmentId === assignmentId);
  const submittedIds = new Set(submissions.map((item) => item.studentId));
  const missingStudents = courseStudents.filter((student) => !submittedIds.has(student.id));
  return {
    expectedCount: courseStudents.length,
    submittedCount: submissions.length,
    gradedCount: submissions.length,
    missingCount: missingStudents.length,
    missingStudents,
  };
}

export function AssignmentListPage() {
  const location = useLocation();
  const [, setRevision] = useState(0);
  const assignments = listAssignments();

  return (
    <div className="proto-wrap">
      <Breadcrumbs fallback={[{ label: "教师首页", to: "/" }]} current="作业列表" />

      <section className="proto-hero compact">
        <div className="proto-eyebrow">Teacher Assignment List</div>
        <h1 className="proto-title">教师端作业列表</h1>
        <p className="proto-desc">
          这里汇总当前已发布作业。教师可统一查看作业详情、编辑作业配置，并切换作业收集状态。
        </p>
        <div className="proto-actions">
          <Link className="proto-btn" to="/">
            返回教师首页
          </Link>
          <Link className="proto-btn primary" state={createBreadcrumbState(location, "作业列表")} to="/teacher/assignments/new">
            发布作业
          </Link>
        </div>
      </section>

      <section className="proto-section-card proto-assignment-list-section">
        <h2 style={{ marginBottom: 16 }}>当前发布的作业</h2>
        {assignments.length ? (
          <div className="proto-assign-table-wrap">
            <table className="proto-assign-table proto-assignment-list-table">
              <colgroup>
                <col className="proto-assign-list-col-name" />
                <col className="proto-assign-list-col-level" />
                <col className="proto-assign-list-col-course" />
                <col className="proto-assign-list-col-expected" />
                <col className="proto-assign-list-col-submitted" />
                <col className="proto-assign-list-col-graded" />
                <col className="proto-assign-list-col-created" />
                <col className="proto-assign-list-col-status" />
                <col className="proto-assign-list-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>作业名称</th>
                  <th>所属学段</th>
                  <th>所属课程</th>
                  <th>应交人数</th>
                  <th>已交人数</th>
                  <th>已改人数</th>
                  <th>创建时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => {
                  const stats = getAssignmentStats(item.id, item.courseId);
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="proto-assignment-link"
                          state={createBreadcrumbState(location, "作业列表")}
                          to={`/teacher/assignments/${item.id}`}
                        >
                          {item.name}
                        </Link>
                        <div className="proto-meta">
                          <span className={`proto-badge ${item.collectionOpen ? "good" : "mid"}`}>
                            {item.collectionOpen ? "收集中" : "未收集"}
                          </span>
                          <span>{item.standardFileName || "未记录标准文件"}</span>
                        </div>
                      </td>
                      <td>{item.levelName || "未分配学段"}</td>
                      <td>{item.courseName || "未分配课程"}</td>
                      <td>{stats.expectedCount}</td>
                      <td>
                        <div className="proto-submission-figure">
                          <span>{stats.submittedCount}</span>
                          <span className={`proto-missing-indicator ${stats.missingCount > 0 ? "bad" : "good"}`}>
                            ({stats.missingCount})
                            <span className="proto-missing-card bottom">
                              <span className="proto-missing-card-title">
                                {stats.missingCount > 0 ? "未交学生名单" : "已全部收齐"}
                              </span>
                              {stats.missingCount > 0 ? (
                                <ul className="proto-missing-list">
                                  {stats.missingStudents.map((student) => (
                                    <li key={student.id}>{student.name}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="proto-missing-complete">本作业当前已全部收齐。</div>
                              )}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>{stats.gradedCount}</td>
                      <td>{item.createdAt}</td>
                      <td>
                        <span className={`proto-badge ${item.collectionOpen ? "good" : "mid"}`}>
                          {item.collectionOpen ? "收集中" : "未收集"}
                        </span>
                      </td>
                      <td>
                        <div className="proto-ops">
                          <Link
                            className="proto-btn small"
                            state={createBreadcrumbState(location, "作业列表")}
                            to={`/teacher/assignments/${item.id}`}
                          >
                            查看
                          </Link>
                          <Link
                            className="proto-btn small"
                            state={createBreadcrumbState(location, "作业列表")}
                            to={`/teacher/assignments/new?editId=${item.id}`}
                          >
                            编辑
                          </Link>
                          <button
                            className="proto-btn small"
                            onClick={() => {
                              void toggleAssignmentCollection(item.id).then(() => setRevision((value) => value + 1));
                            }}
                            type="button"
                          >
                            {item.collectionOpen ? "停止收集" : "开始收集"}
                          </button>
                          <button
                            className="proto-btn small"
                            onClick={() => {
                              void deleteAssignment(item.id).then(() => setRevision((value) => value + 1));
                            }}
                            type="button"
                          >
                            删除作业
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="proto-empty">当前没有已发布作业，请先进入“发布作业”页面创建新作业。</div>
        )}
      </section>
    </div>
  );
}
