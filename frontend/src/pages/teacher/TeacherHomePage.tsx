import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { useAuth } from "../../lib/auth-context";
import { createBreadcrumbState } from "../../lib/navigation";
import {
  addCourse,
  addStudent,
  deleteAssignment,
  importStudents,
  listAssignments,
  listCourses,
  listLevels,
  listStudents,
  listSubmissions,
  toggleAssignmentCollection,
} from "../../lib/mock-db";
import { readTeacherHomeState, writeTeacherHomeState } from "../../lib/teacher-home-state";

type TeacherTab = "students" | "assignments";
type StudentView = "card" | "list";
type ConfigMode = "" | "manual" | "batch";

function initialFromName(name?: string) {
  return Array.from(name || "教")[0] || "教";
}

export function TeacherHomePage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const levels = listLevels();
  const persistedState = useMemo(() => readTeacherHomeState(), []);
  const [focusLevelId, setFocusLevelId] = useState(persistedState.focusLevelId);
  const [userOpen, setUserOpen] = useState(false);
  const [selectedCourseByLevel, setSelectedCourseByLevel] = useState<Record<string, string>>(persistedState.selectedCourseByLevel);
  const [tabByLevel, setTabByLevel] = useState<Record<string, TeacherTab>>(persistedState.tabByLevel);
  const [viewByLevel, setViewByLevel] = useState<Record<string, StudentView>>(persistedState.viewByLevel);
  const [studentSearchDraftByLevel, setStudentSearchDraftByLevel] = useState<Record<string, string>>(
    persistedState.studentSearchDraftByLevel,
  );
  const [studentSearchByLevel, setStudentSearchByLevel] = useState<Record<string, string>>(persistedState.studentSearchByLevel);
  const [configModeByLevel, setConfigModeByLevel] = useState<Record<string, ConfigMode>>({});
  const [addCourseOpenLevel, setAddCourseOpenLevel] = useState("");
  const [courseDraftByLevel, setCourseDraftByLevel] = useState<Record<string, string>>({});
  const [studentDraftByLevel, setStudentDraftByLevel] = useState<
    Record<string, { id: string; name: string; major: string; className: string; contact: string }>
  >({});
  const [batchDraftByLevel, setBatchDraftByLevel] = useState<Record<string, string>>({});
  const [, setRevision] = useState(0);

  function rerender() {
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    writeTeacherHomeState({
      focusLevelId,
      selectedCourseByLevel,
      tabByLevel,
      viewByLevel,
      studentSearchDraftByLevel,
      studentSearchByLevel,
    });
  }, [focusLevelId, selectedCourseByLevel, studentSearchByLevel, studentSearchDraftByLevel, tabByLevel, viewByLevel]);

  function getCourses(levelId: string) {
    return listCourses(levelId);
  }

  function getSelectedCourseId(levelId: string) {
    const courses = getCourses(levelId);
    return selectedCourseByLevel[levelId] || courses[0]?.id || "";
  }

  function getAssignmentStats(assignmentId: string, courseId: string) {
    const courseStudents = listStudents(courseId);
    const submissions = listSubmissions().filter((item) => item.assignmentId === assignmentId);
    const submittedIds = new Set(submissions.map((item) => item.studentId));
    const missingStudents = courseStudents.filter((student) => !submittedIds.has(student.id));
    return {
      expectedCount: courseStudents.length,
      submittedCount: submissions.length,
      missingCount: missingStudents.length,
      missingStudents,
    };
  }

  async function submitCourse(levelId: string, event: FormEvent) {
    event.preventDefault();
    const name = courseDraftByLevel[levelId]?.trim();
    if (!name) return;
    const course = await addCourse({ levelId, name });
    setSelectedCourseByLevel((current) => ({ ...current, [levelId]: course.id }));
    setCourseDraftByLevel((current) => ({ ...current, [levelId]: "" }));
    setAddCourseOpenLevel("");
    rerender();
  }

  async function submitStudent(levelId: string, event?: FormEvent) {
    event?.preventDefault();
    const courseId = getSelectedCourseId(levelId);
    if (!courseId) return;
    const draft = studentDraftByLevel[levelId];
    if (!draft?.name || !draft?.id) return;
    await addStudent(courseId, draft);
    setStudentDraftByLevel((current) => ({
      ...current,
      [levelId]: { id: "", name: "", major: "", className: "", contact: "" },
    }));
    setConfigModeByLevel((current) => ({ ...current, [levelId]: "" }));
    rerender();
  }

  async function submitBatch(levelId: string, event?: FormEvent) {
    event?.preventDefault();
    const courseId = getSelectedCourseId(levelId);
    const rawText = batchDraftByLevel[levelId]?.trim();
    if (!courseId || !rawText) return;
    await importStudents(courseId, rawText);
    setBatchDraftByLevel((current) => ({ ...current, [levelId]: "" }));
    setConfigModeByLevel((current) => ({ ...current, [levelId]: "" }));
    rerender();
  }

  const visibleLevels = useMemo(
    () => (focusLevelId ? levels.filter((item) => item.id === focusLevelId) : levels),
    [focusLevelId, levels],
  );

  return (
    <div className="proto-wrap">
      <Breadcrumbs current="教师首页" />
      <section className="proto-hero">
        <div className="proto-topbar">
          <div>
            <div className="proto-eyebrow">Teacher Workspace</div>
            <h1 className="proto-title">教师端首页</h1>
            <p className="proto-desc">
              首页保留课程区在左、学生与作业工作台在右的稳定布局，同时将学段目录收回到页面整体左侧，便于直接定位到本科生、研究生、博士生对应部分。
            </p>
            <div className="proto-actions">
              <Link className="proto-btn primary" to="/teacher/assignments/new">
                发布作业
              </Link>
              <Link className="proto-btn" to="/teacher/assignments">
                查看作业列表
              </Link>
              <Link className="proto-btn" state={createBreadcrumbState(location, "教师首页")} to="/teacher/students">
                查看学生列表
              </Link>
            </div>
          </div>

          <div className="proto-user-shell">
            <button className="proto-user-card" onClick={() => setUserOpen((value) => !value)} type="button">
              <div className="proto-avatar">{initialFromName(user?.name)}</div>
              <div>
                <div className="proto-user-label">当前教师</div>
                <div className="proto-user-name">{user?.name ?? "教师账号"}</div>
                <div className="proto-user-value">
                  {user?.workerId ?? "未登记"} · {user?.contact ?? "未登记"}
                </div>
              </div>
            </button>
            {userOpen ? (
              <div className="proto-popover">
                <div className="proto-popover-head">
                  <div className="proto-avatar">{initialFromName(user?.name)}</div>
                  <div>
                    <div className="proto-popover-name">{user?.name ?? "教师账号"}</div>
                    <div className="proto-popover-meta">
                      工号：{user?.workerId ?? "未登记"}
                      <br />
                      联系方式：{user?.contact ?? "未登记"}
                    </div>
                  </div>
                </div>
                <div className="proto-actions">
                  <button className="proto-btn small" onClick={logout} type="button">
                    退出登录
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="proto-page-layout">
        <div className="proto-level-nav-mount">
          <div className="proto-level-nav">
            <div className="proto-level-nav-title">学段目录</div>
            <div className="proto-level-nav-list">
              {levels.map((level) => (
                <button
                  className={`proto-level-link ${focusLevelId === level.id ? "active" : ""}`}
                  key={level.id}
                  onClick={() => setFocusLevelId((current) => (current === level.id ? "" : level.id))}
                  type="button"
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="proto-content-stack">
          {visibleLevels.map((level) => {
            const courses = getCourses(level.id);
            const courseId = getSelectedCourseId(level.id);
            const course = courses.find((item) => item.id === courseId) ?? null;
            const activeTab = tabByLevel[level.id] ?? "students";
            const viewMode = viewByLevel[level.id] ?? "card";
            const configMode = configModeByLevel[level.id] ?? "";
            const students = course ? listStudents(course.id) : [];
            const appliedStudentKeyword = (studentSearchByLevel[level.id] ?? "").trim();
            const filteredStudents = appliedStudentKeyword
              ? students.filter(
                  (student) => student.name.includes(appliedStudentKeyword) || student.id.includes(appliedStudentKeyword),
                )
              : students;
            const assignments = course ? listAssignments(course.id) : [];
            const cardColumnCount = filteredStudents.length === 0 ? 3 : Math.min(filteredStudents.length + 1, 4);
            const studentDraft = studentDraftByLevel[level.id] ?? {
              id: "",
              name: "",
              major: "",
              className: "",
              contact: "",
            };
            const publishHref = course
              ? `/teacher/assignments/new?courseId=${encodeURIComponent(course.id)}`
              : `/teacher/assignments/new?level=${encodeURIComponent(level.id)}`;

            return (
              <section className="proto-section-card" id={`section-${level.id}`} key={level.id}>
                <div className="proto-section-head">
                  <div>
                    <div className="proto-eyebrow">{level.name}</div>
                    <h2>{level.name}</h2>
                    <p className="proto-section-desc">
                      本学段延续左侧课程、右侧学生与作业工作台的布局。课程卡片尺寸保持与原“学段和课程”区域一致，便于快速切换与管理。
                    </p>
                  </div>
                </div>

                <div className="proto-level-layout">
                  <aside className="proto-sidebar-card">
                    <div className="proto-sidebar-top">
                      <h3>课程</h3>
                      <button
                        className="proto-btn small"
                        onClick={() => setAddCourseOpenLevel((current) => (current === level.id ? "" : level.id))}
                        type="button"
                      >
                        新增课程
                      </button>
                      <div
                        className={`proto-floating-card ${addCourseOpenLevel === level.id ? "show" : ""}`}
                        onMouseLeave={() => setAddCourseOpenLevel("")}
                      >
                        <form onSubmit={(event) => submitCourse(level.id, event)}>
                          <h3>新增课程</h3>
                          <p className="proto-muted">
                            课程会自动归属到当前学段，鼠标离开该区域后卡片关闭。
                          </p>
                          <div className="proto-field">
                            <label>课程名称</label>
                            <input
                              value={courseDraftByLevel[level.id] ?? ""}
                              onChange={(event) =>
                                setCourseDraftByLevel((current) => ({ ...current, [level.id]: event.target.value }))
                              }
                              placeholder="请输入课程名称"
                            />
                          </div>
                          <div className="proto-actions">
                            <button className="proto-btn primary" type="submit">
                              确认新增
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div className="proto-course-list">
                      {courses.length ? (
                        courses.map((item) => (
                          <button
                            className={`proto-course-item ${item.id === courseId ? "active" : ""}`}
                            key={item.id}
                            onClick={() => setSelectedCourseByLevel((current) => ({ ...current, [level.id]: item.id }))}
                            type="button"
                          >
                            <div className="proto-course-name">{item.name}</div>
                            <div className="proto-course-meta">
                              学生人数：{listStudents(item.id).length}
                              <br />
                              已发布作业：{listAssignments(item.id).length}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="proto-empty">当前学段尚未创建课程。</div>
                      )}
                    </div>
                    <div className="proto-muted" style={{ marginTop: 14 }}>
                      点击课程卡片即可切换右侧工作台内容。新增课程入口不再常驻，下拉式浮层只在需要时出现。
                    </div>
                  </aside>

                  <main className="proto-content-card">
                    <div className="proto-workspace-header">
                      <div className="proto-workspace-title-row">
                        <div className="proto-workspace-heading">
                          <div className="proto-workspace-title-cluster">
                            <h3>{course ? course.name : "课程工作台"}</h3>
                            {course ? (
                              <div className="proto-workspace-stats">
                                <span className="proto-mini-chip">课程学生 {students.length}</span>
                                <span className="proto-mini-chip">已发布作业 {assignments.length}</span>
                              </div>
                            ) : null}
                          </div>
                          {!course ? <div className="proto-muted">请先创建或选择课程。</div> : null}
                        </div>
                        {activeTab === "students" && course ? (
                          <form
                            className="proto-workspace-search"
                            onSubmit={(event) => {
                              event.preventDefault();
                              setStudentSearchByLevel((current) => ({
                                ...current,
                                [level.id]: (studentSearchDraftByLevel[level.id] ?? "").trim(),
                              }));
                            }}
                          >
                            <input
                              className="proto-search-input"
                              onChange={(event) =>
                                setStudentSearchDraftByLevel((current) => ({
                                  ...current,
                                  [level.id]: event.target.value,
                                }))
                              }
                              placeholder="搜索学生姓名或学号"
                              type="search"
                              value={studentSearchDraftByLevel[level.id] ?? ""}
                            />
                            <button className="proto-btn small" type="submit">
                              查询
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="proto-workspace-controls">
                        <div className="proto-mode-tabs">
                          <button
                            className={activeTab === "students" ? "active" : ""}
                            onClick={() => setTabByLevel((current) => ({ ...current, [level.id]: "students" }))}
                            type="button"
                          >
                            学生
                          </button>
                          <button
                            className={activeTab === "assignments" ? "active" : ""}
                            onClick={() => setTabByLevel((current) => ({ ...current, [level.id]: "assignments" }))}
                            type="button"
                          >
                            作业
                          </button>
                        </div>
                        {activeTab === "students" ? (
                          <div className="proto-toolbar-block proto-workspace-display">
                            <span className="proto-sub-toolbar-title">展示方式</span>
                            <div className="proto-segment compact">
                              <button
                                className={viewMode === "card" ? "active" : ""}
                                onClick={() => setViewByLevel((current) => ({ ...current, [level.id]: "card" }))}
                                type="button"
                              >
                                卡片视图
                              </button>
                              <button
                                className={viewMode === "list" ? "active" : ""}
                                onClick={() => setViewByLevel((current) => ({ ...current, [level.id]: "list" }))}
                                type="button"
                              >
                                列表视图
                              </button>
                            </div>
                          </div>
                        ) : course ? (
                          <div className="proto-actions proto-actions-tight">
                            <Link className="proto-btn primary" state={createBreadcrumbState(location, "教师首页")} to={publishHref}>
                              发布作业
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {activeTab === "students" ? (
                      <>
                        {course ? (
                          viewMode === "card" ? (
                            <div
                              className="proto-students-grid proto-students-grid-cards"
                              style={{ gridTemplateColumns: `repeat(${cardColumnCount}, minmax(0, 1fr))` }}
                            >
                              {filteredStudents.map((student) => (
                                <div className="proto-student-card" key={student.id}>
                                  <Link
                                    className="proto-student-link"
                                    state={createBreadcrumbState(location, "教师首页")}
                                    to={`/teacher/courses/${course.id}/students/${student.id}/growth`}
                                  >
                                    {student.name}
                                  </Link>
                                  <div className="proto-student-meta">
                                    学号：{student.id}
                                    <br />
                                    专业：{student.major || "未配置"}
                                    <br />
                                    班级：{student.className || "未配置"}
                                    <br />
                                    联系方式：{student.contact || "未配置"}
                                  </div>
                                  <div className="proto-actions" style={{ marginTop: 14 }}>
                                    <Link
                                      className="proto-btn small"
                                      state={createBreadcrumbState(location, "教师首页")}
                                      to={`/teacher/courses/${course.id}/students/${student.id}/growth`}
                                    >
                                      查看成长路径
                                    </Link>
                                  </div>
                                </div>
                              ))}
                              <div className="proto-student-config-host">
                                <div className="proto-student-config-card">
                                  <div className="proto-plus-orb">+</div>
                                  <div className="proto-student-config-label">配置学生</div>
                                  <div className="proto-student-config-actions">
                                    <button
                                      className="proto-btn small"
                                      onClick={() =>
                                        setConfigModeByLevel((current) => ({
                                          ...current,
                                          [level.id]: current[level.id] === "manual" ? "" : "manual",
                                        }))
                                      }
                                      type="button"
                                    >
                                      添加学生
                                    </button>
                                    <button
                                      className="proto-btn small"
                                      onClick={() =>
                                        setConfigModeByLevel((current) => ({
                                          ...current,
                                          [level.id]: current[level.id] === "batch" ? "" : "batch",
                                        }))
                                      }
                                      type="button"
                                    >
                                      Excel 导入
                                    </button>
                                  </div>
                                </div>
                                <div className={`proto-config-card proto-config-card-inline ${configMode ? "show" : ""}`}>
                                  {configMode === "manual" ? (
                                    <form onSubmit={(event) => submitStudent(level.id, event)}>
                                      <button
                                        aria-label="关闭"
                                        className="proto-floating-close"
                                        onClick={() =>
                                          setConfigModeByLevel((current) => ({
                                            ...current,
                                            [level.id]: "",
                                          }))
                                        }
                                        type="button"
                                      >
                                        ×
                                      </button>
                                      <h4 style={{ marginBottom: 10 }}>添加学生</h4>
                                      <div className="proto-muted" style={{ marginBottom: 10 }}>
                                        用于零星补录单个学生。
                                      </div>
                                      <div className="proto-field">
                                        <label>姓名</label>
                                        <input
                                          value={studentDraft.name}
                                          onChange={(event) =>
                                            setStudentDraftByLevel((current) => ({
                                              ...current,
                                              [level.id]: { ...studentDraft, name: event.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="proto-field">
                                        <label>学号</label>
                                        <input
                                          value={studentDraft.id}
                                          onChange={(event) =>
                                            setStudentDraftByLevel((current) => ({
                                              ...current,
                                              [level.id]: { ...studentDraft, id: event.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="proto-field">
                                        <label>专业</label>
                                        <input
                                          value={studentDraft.major}
                                          onChange={(event) =>
                                            setStudentDraftByLevel((current) => ({
                                              ...current,
                                              [level.id]: { ...studentDraft, major: event.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="proto-field">
                                        <label>班级</label>
                                        <input
                                          value={studentDraft.className}
                                          onChange={(event) =>
                                            setStudentDraftByLevel((current) => ({
                                              ...current,
                                              [level.id]: { ...studentDraft, className: event.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="proto-field">
                                        <label>联系方式</label>
                                        <input
                                          value={studentDraft.contact}
                                          onChange={(event) =>
                                            setStudentDraftByLevel((current) => ({
                                              ...current,
                                              [level.id]: { ...studentDraft, contact: event.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <button className="proto-btn primary" type="submit">
                                        保存学生
                                      </button>
                                    </form>
                                  ) : configMode === "batch" ? (
                                    <form onSubmit={(event) => void submitBatch(level.id, event)}>
                                      <button
                                        aria-label="关闭"
                                        className="proto-floating-close"
                                        onClick={() =>
                                          setConfigModeByLevel((current) => ({
                                            ...current,
                                            [level.id]: "",
                                          }))
                                        }
                                        type="button"
                                      >
                                        ×
                                      </button>
                                      <h4 style={{ marginBottom: 10 }}>Excel 导入</h4>
                                      <div className="proto-muted" style={{ marginBottom: 10 }}>
                                        将 Excel 中的学生表复制后直接粘贴到下方文本框。首行建议为：姓名、学号、专业、班级、联系方式。
                                      </div>
                                      <div className="proto-field">
                                        <label>批量导入内容</label>
                                        <textarea
                                          value={batchDraftByLevel[level.id] ?? ""}
                                          onChange={(event) =>
                                            setBatchDraftByLevel((current) => ({ ...current, [level.id]: event.target.value }))
                                          }
                                          placeholder={"姓名\t学号\t专业\t班级\t联系方式"}
                                        />
                                      </div>
                                      <button className="proto-btn primary" type="submit">
                                        批量导入
                                      </button>
                                    </form>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="proto-student-list-stage">
                              {!filteredStudents.length ? (
                                <div className="proto-empty proto-student-list-empty">
                                  {appliedStudentKeyword
                                    ? "当前检索条件下没有匹配的学生，请修改姓名或学号后重试。"
                                    : "当前课程尚未配置学生。你可以通过表格中的加号入口，选择“添加学生”进行零星录入，或选择“Excel 导入”进行批量初始化。"}
                                </div>
                              ) : null}
                              <div className="proto-table-shell">
                                <table className="proto-table">
                                  <colgroup>
                                    <col className="proto-student-col-name" />
                                    <col className="proto-student-col-id" />
                                    <col className="proto-student-col-major" />
                                    <col className="proto-student-col-class" />
                                    <col className="proto-student-col-contact" />
                                    <col className="proto-student-col-action" />
                                  </colgroup>
                                  <thead>
                                    <tr>
                                      <th>姓名</th>
                                      <th>学号</th>
                                      <th>专业</th>
                                      <th>班级</th>
                                      <th>联系方式</th>
                                      <th>成长路径</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredStudents.map((student) => (
                                      <tr key={student.id}>
                                        <td>
                                          <Link
                                            state={createBreadcrumbState(location, "教师首页")}
                                            to={`/teacher/courses/${course.id}/students/${student.id}/growth`}
                                          >
                                            {student.name}
                                          </Link>
                                        </td>
                                        <td>{student.id}</td>
                                        <td>{student.major || "未配置"}</td>
                                        <td>{student.className || "未配置"}</td>
                                        <td>{student.contact || "未配置"}</td>
                                        <td>
                                          <Link
                                            className="proto-btn small"
                                            state={createBreadcrumbState(location, "教师首页")}
                                            to={`/teacher/courses/${course.id}/students/${student.id}/growth`}
                                          >
                                            查看成长路径
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                    {configMode !== "manual" ? <tr className="proto-list-action-row">
                                      <td>
                                        <div className="proto-list-cell-entry">
                                          <span className="proto-list-plus" aria-hidden="true">
                                            +
                                          </span>
                                          <div className={`proto-list-add-actions ${configMode === "batch" ? "show" : ""}`}>
                                            <button
                                              className="proto-btn small"
                                              onClick={() =>
                                                setConfigModeByLevel((current) => ({
                                                  ...current,
                                                  [level.id]: current[level.id] === "manual" ? "" : "manual",
                                                }))
                                              }
                                              type="button"
                                            >
                                              添加学生
                                            </button>
                                            <div className="proto-list-batch-anchor">
                                              <button
                                                className={`proto-btn small ${configMode === "batch" ? "primary" : ""}`}
                                                onClick={() =>
                                                  setConfigModeByLevel((current) => ({
                                                    ...current,
                                                    [level.id]: current[level.id] === "batch" ? "" : "batch",
                                                  }))
                                                }
                                                type="button"
                                              >
                                                Excel 导入
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td colSpan={5}></td>
                                    </tr> : null}
                                    {configMode === "manual" ? (
                                      <tr className="proto-list-edit-row">
                                        <td>
                                          <input
                                            placeholder="姓名"
                                            value={studentDraft.name}
                                            onChange={(event) =>
                                              setStudentDraftByLevel((current) => ({
                                                ...current,
                                                [level.id]: { ...studentDraft, name: event.target.value },
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            placeholder="学号"
                                            value={studentDraft.id}
                                            onChange={(event) =>
                                              setStudentDraftByLevel((current) => ({
                                                ...current,
                                                [level.id]: { ...studentDraft, id: event.target.value },
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            placeholder="专业"
                                            value={studentDraft.major}
                                            onChange={(event) =>
                                              setStudentDraftByLevel((current) => ({
                                                ...current,
                                                [level.id]: { ...studentDraft, major: event.target.value },
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            placeholder="班级"
                                            value={studentDraft.className}
                                            onChange={(event) =>
                                              setStudentDraftByLevel((current) => ({
                                                ...current,
                                                [level.id]: { ...studentDraft, className: event.target.value },
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            placeholder="联系方式"
                                            value={studentDraft.contact}
                                            onChange={(event) =>
                                              setStudentDraftByLevel((current) => ({
                                                ...current,
                                                [level.id]: { ...studentDraft, contact: event.target.value },
                                              }))
                                            }
                                          />
                                        </td>
                                        <td className="proto-list-edit-actions">
                                            <button className="proto-btn small primary" onClick={() => void submitStudent(level.id)} type="button">
                                            保存学生
                                          </button>
                                          <button
                                            className="proto-btn small"
                                            onClick={() =>
                                              setConfigModeByLevel((current) => ({
                                                ...current,
                                                [level.id]: "",
                                              }))
                                            }
                                            type="button"
                                          >
                                            取消
                                          </button>
                                        </td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                              <div className={`proto-config-card proto-config-card-list ${configMode === "batch" ? "show" : ""}`}>
                                {configMode === "batch" ? (
                                  <form onSubmit={(event) => void submitBatch(level.id, event)}>
                                    <button
                                      aria-label="关闭"
                                      className="proto-floating-close"
                                      onClick={() =>
                                        setConfigModeByLevel((current) => ({
                                          ...current,
                                          [level.id]: "",
                                        }))
                                      }
                                      type="button"
                                    >
                                      ×
                                    </button>
                                    <h4 style={{ marginBottom: 10 }}>Excel 导入</h4>
                                    <div className="proto-muted" style={{ marginBottom: 10 }}>
                                      将 Excel 中的学生表复制后直接粘贴到下方文本框。首行建议为：姓名、学号、专业、班级、联系方式。
                                    </div>
                                    <div className="proto-field">
                                      <label>批量导入内容</label>
                                      <textarea
                                        value={batchDraftByLevel[level.id] ?? ""}
                                        onChange={(event) =>
                                          setBatchDraftByLevel((current) => ({ ...current, [level.id]: event.target.value }))
                                        }
                                        placeholder={"姓名\t学号\t专业\t班级\t联系方式"}
                                      />
                                    </div>
                                    <button className="proto-btn primary" type="submit">
                                      批量导入
                                    </button>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="proto-empty">请先在左侧选择课程。</div>
                        )}
                      </>
                    ) : (
                      <>
                        {course ? (
                          assignments.length ? (
                            <div className="proto-assign-table-wrap">
                              <table className="proto-assign-table">
                                <colgroup>
                                  <col />
                                  <col />
                                  <col />
                                  <col />
                                  <col />
                                  <col />
                                  <col />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th>作业名称</th>
                                    <th>应交人数</th>
                                    <th>已交人数</th>
                                    <th>已改人数</th>
                                    <th>创建时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {assignments.map((assignment) => {
                                    const stats = getAssignmentStats(assignment.id, course.id);
                                    return (
                                      <tr key={assignment.id}>
                                        <td>{assignment.name}</td>
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
                                        <td>{assignment.gradedCount}</td>
                                        <td>{assignment.createdAt}</td>
                                        <td>
                                          <span className={`proto-badge ${assignment.collectionOpen ? "good" : "mid"}`}>
                                            {assignment.collectionOpen ? "收集中" : "未收集"}
                                          </span>
                                        </td>
                                        <td>
                                          <div className="proto-inline-actions">
                                            <Link className="proto-btn small" state={createBreadcrumbState(location, "教师首页")} to={`/teacher/assignments/${assignment.id}`}>
                                              查看详情
                                            </Link>
                                            <Link className="proto-btn small" state={createBreadcrumbState(location, "教师首页")} to={`/teacher/assignments/new?editId=${assignment.id}`}>
                                              编辑
                                            </Link>
                                            <button
                                              className="proto-btn small"
                                              onClick={() => {
                                                void toggleAssignmentCollection(assignment.id).then(() => rerender());
                                              }}
                                              type="button"
                                            >
                                              {assignment.collectionOpen ? "停止收集" : "开始收集"}
                                            </button>
                                            <button
                                              className="proto-btn small"
                                              onClick={() => {
                                                void deleteAssignment(assignment.id).then(() => rerender());
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
                            <div className="proto-empty">当前课程尚未发布作业，可直接点击“发布作业”。</div>
                          )
                        ) : (
                          <div className="proto-empty">请先选择课程。</div>
                        )}
                      </>
                    )}
                  </main>
                </div>
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
