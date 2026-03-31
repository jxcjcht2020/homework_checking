import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { GrowthVisualization, growthDimensionMeta } from "../../components/common/GrowthVisualization";
import { useAuth } from "../../lib/auth-context";
import { getStudentAssignments, getStudentCourses, getStudentGrowth, getStudentProfile } from "../../lib/mock-db";
import { createBreadcrumbState } from "../../lib/navigation";

function initialFromName(name?: string) {
  return Array.from(name || "学")[0] || "学";
}

export function StudentHomePage() {
  const { user, logout, refresh } = useAuth();
  const location = useLocation();
  const [userOpen, setUserOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const studentId = user?.studentId ?? "";
  const profile = getStudentProfile(studentId);
  const courses = getStudentCourses(studentId);
  const assignments = getStudentAssignments(studentId);
  const growthHistory = useMemo(() => getStudentGrowth(studentId), [studentId, user]);
  const [selectedGrowthIndex, setSelectedGrowthIndex] = useState(Math.max(growthHistory.length - 1, 0));
  const selectedGrowth = growthHistory[selectedGrowthIndex];
  const previousGrowth = selectedGrowthIndex > 0 ? growthHistory[selectedGrowthIndex - 1] : null;

  useEffect(() => {
    setSelectedGrowthIndex(Math.max(growthHistory.length - 1, 0));
  }, [growthHistory.length]);

  useEffect(() => {
    const hasPendingReview = assignments.some((item) => item.status === "已提交");
    if (!hasPendingReview) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [assignments, refresh]);

  const gradedCount = assignments.filter((item) => item.review).length;

  function getSignalText(delta: number) {
    if (delta >= 5) return { text: "明显进步", cls: "up" };
    if (delta >= 2) return { text: "稳步提升", cls: "up" };
    if (delta > -2) return { text: "保持稳定", cls: "flat" };
    return { text: "继续补强", cls: "soft" };
  }

  return (
    <div className="proto-wrap proto-student-wrap">
      <Breadcrumbs current="学生首页" />
      <section className="proto-hero">
        <div className="proto-topbar">
          <div>
            <div className="proto-eyebrow">Student Workspace</div>
            <h1 className="proto-title">学生端首页</h1>
            <p className="proto-desc">
              这里汇总当前分配到你名下的全部作业。未提交的作业可直接进入提交页；已提交的作业会显示“作业批改中”；批改完成后可自行点击查看结果。
            </p>
            <div className="proto-actions">
              <Link className="proto-btn primary" state={createBreadcrumbState(location, "学生首页")} to="/student/submissions/new">
                提交作业
              </Link>
            </div>
          </div>

          <div className="proto-user-shell">
            <button className="proto-user-card" onClick={() => setUserOpen((value) => !value)} type="button">
              <div className="proto-avatar">{initialFromName(user?.name)}</div>
              <div>
                <div className="proto-user-label">当前学生</div>
                <div className="proto-user-name">{user?.name ?? "学生姓名"}</div>
                <div className="proto-user-value">
                  {user?.studentId ?? "未登记"} · {user?.contact ?? "未登记"}
                </div>
              </div>
            </button>
            {userOpen ? (
              <div className="proto-popover">
                <div className="proto-popover-head">
                  <div className="proto-avatar">{initialFromName(user?.name)}</div>
                  <div>
                    <div className="proto-popover-name">{user?.name ?? "学生姓名"}</div>
                    <div className="proto-popover-meta">
                      学号：{user?.studentId ?? "未登记"}
                      <br />
                      联系方式：{user?.contact ?? "未登记"}
                    </div>
                  </div>
                </div>
                {profile ? (
                  <div className="proto-profile-meta">
                    专业：{profile.major || "未配置"}
                    <br />
                    班级：{profile.className || "未配置"}
                  </div>
                ) : null}
                <div className="proto-actions">
                  <button className="proto-btn small" onClick={logout} type="button">
                    退出登录
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="proto-info-strip">
          <div className="proto-info-box">
            <div className="proto-info-label">当前课程数</div>
            <div className="proto-info-value">{courses.length}</div>
          </div>
          <div className="proto-info-box">
            <div className="proto-info-label">已发布作业</div>
            <div className="proto-info-value">{assignments.length}</div>
          </div>
          <div className="proto-info-box">
            <div className="proto-info-label">已完成批改</div>
            <div className="proto-info-value">{gradedCount}</div>
          </div>
        </div>
      </section>

      <section className="proto-section-card">
        <div className="proto-toolbar">
          <div className="proto-toolbar-left">
            <h2>我的作业</h2>
            <div className="proto-muted">作业状态分为未提交、已提交、已批改三类。若显示“作业批改中”，说明系统已接收文件，正在后台生成批改结果。</div>
          </div>
          <div className="proto-segment">
            <button className={viewMode === "card" ? "active" : ""} onClick={() => setViewMode("card")} type="button">
              卡片视图
            </button>
            <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} type="button">
              列表视图
            </button>
          </div>
        </div>

        {assignments.length ? (
          viewMode === "card" ? (
            <div className="proto-assignment-grid">
              {assignments.map((assignment) => (
                <div className="proto-assignment-card" key={assignment.id}>
                  <div className={`proto-status-flag ${assignment.status === "已批改" ? "good" : assignment.status === "已提交" ? "mid" : "soft"}`}>
                    {assignment.status}
                  </div>
                  <div className="proto-assignment-title">{assignment.name}</div>
                  <div className="proto-assignment-meta">
                    课程：{assignment.courseName}
                    <br />
                    发布时间：{assignment.createdAt}
                    <br />
                    收集状态：{assignment.collectionOpen ? "收集中" : "已停止收集"}
                    <br />
                    {assignment.submission ? `最近提交：${assignment.submission.submittedAt}` : "当前尚无提交记录"}
                  </div>
                  <div className="proto-actions" style={{ marginTop: 16 }}>
                    {assignment.review ? (
                      <Link
                        className="proto-btn review"
                        state={createBreadcrumbState(location, "学生首页")}
                        to={`/student/reviews?courseId=${assignment.courseId}&assignmentId=${assignment.id}`}
                      >
                        查看批改结果
                      </Link>
                    ) : assignment.submission ? (
                      <span className="proto-btn wait">作业批改中</span>
                    ) : (
                      <Link
                        className="proto-btn submit"
                        state={createBreadcrumbState(location, "学生首页")}
                        to={`/student/submissions/new?courseId=${assignment.courseId}&assignmentId=${assignment.id}`}
                      >
                        去提交作业
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="proto-table">
              <thead>
                <tr>
                  <th>作业名称</th>
                  <th>课程</th>
                  <th>创建时间</th>
                  <th>当前状态</th>
                  <th>最近提交</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.name}</td>
                    <td>{assignment.courseName}</td>
                    <td>{assignment.createdAt}</td>
                    <td>
                      <span className={`proto-status-pill ${assignment.status === "已批改" ? "good" : assignment.status === "已提交" ? "mid" : "soft"}`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td>{assignment.submission ? assignment.submission.submittedAt : "暂无提交"}</td>
                    <td>
                      {assignment.review ? (
                        <Link
                          className="proto-btn small review"
                          state={createBreadcrumbState(location, "学生首页")}
                          to={`/student/reviews?courseId=${assignment.courseId}&assignmentId=${assignment.id}`}
                        >
                          查看批改结果
                        </Link>
                      ) : assignment.submission ? (
                        <span className="proto-btn small wait">作业批改中</span>
                      ) : (
                        <Link
                          className="proto-btn small submit"
                          state={createBreadcrumbState(location, "学生首页")}
                          to={`/student/submissions/new?courseId=${assignment.courseId}&assignmentId=${assignment.id}`}
                        >
                          去提交作业
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="proto-empty">当前尚未检索到分配给你的作业。若教师刚完成发布，请稍后刷新页面。</div>
        )}
      </section>

      <section className="proto-section-card">
        <div className="proto-toolbar">
          <div className="proto-toolbar-left">
            <h2>我的成长路径</h2>
            <div className="proto-muted">
              这里会保留你每次作业后的能力变化轨迹。默认展示最新一次作业；点击任意成长节点后，可回看对应作业形成的能力轮廓，也可以翻转查看整体上升趋势。
            </div>
          </div>
        </div>

        {selectedGrowth ? (
          <div className="proto-growth-grid">
            <div className="proto-growth-panel">
              <div className="proto-growth-panel-head">
                <div>
                  <h3>多维能力轮廓</h3>
                  <p>点击右侧成长节点后，图卡会联动切换到对应作业的能力轮廓；点击图卡边缘区域或右上角按钮，可翻转查看整体趋势。</p>
                </div>
              </div>

              <GrowthVisualization history={growthHistory} onSelect={setSelectedGrowthIndex} selectedIndex={selectedGrowthIndex} />

              <div className="proto-growth-signals">
                {growthDimensionMeta.map((item) => {
                  const currentValue = selectedGrowth.dimensionScores[item.key];
                  const previousValue = previousGrowth ? previousGrowth.dimensionScores[item.key] : 50;
                  const signal = getSignalText(currentValue - previousValue);
                  return (
                    <span className={`proto-signal ${signal.cls}`} key={item.key}>
                      {item.label}：{signal.text}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="proto-growth-panel">
              <div className="proto-growth-panel-head">
                <div>
                  <h3>成长节点摘录</h3>
                  <p>每次作业都会留下一个成长节点。点击任意一次作业，即可查看该次作业之后你的能力状态与趋势提示。</p>
                </div>
              </div>
              <div className="proto-growth-track">
                {growthHistory.map((entry, index) => (
                  <button
                    className={`proto-growth-step ${index === selectedGrowthIndex ? "selected" : ""}`}
                    key={entry.reviewId}
                    onClick={() => setSelectedGrowthIndex(index)}
                    type="button"
                  >
                    <div className="proto-growth-step-top">
                      <div className="proto-growth-step-index">第 {index + 1} 次作业</div>
                      <div className="proto-growth-step-date">{entry.reviewDate}</div>
                    </div>
                    <h3>{entry.assignmentName}</h3>
                    <p>{entry.studentSummary}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="proto-empty">当前暂无成长记录。完成首次作业批改后，这里会自动形成你的能力变化轨迹。</div>
        )}
      </section>
    </div>
  );
}
