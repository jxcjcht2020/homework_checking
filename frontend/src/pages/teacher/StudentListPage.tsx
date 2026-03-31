import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { createBreadcrumbState } from "../../lib/navigation";
import { addStudent, importStudents, listCourses, listLevels, listTeacherStudents } from "../../lib/mock-db";
import type { TeacherStudentListItem } from "../../types/domain";

type StudentConfigMode = "" | "manual" | "batch";

export function StudentListPage() {
  const location = useLocation();
  const levels = listLevels();
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [configMode, setConfigMode] = useState<StudentConfigMode>("");
  const [formLevelId, setFormLevelId] = useState("graduate");
  const [formCourseId, setFormCourseId] = useState("");
  const [studentDraft, setStudentDraft] = useState({
    name: "",
    id: "",
    major: "",
    className: "",
    contact: "",
  });
  const [batchDraft, setBatchDraft] = useState("");

  const filteredCourses = useMemo(() => listCourses(levelFilter || undefined), [levelFilter]);
  const formCourses = useMemo(() => listCourses(formLevelId), [formLevelId]);

  async function loadStudents(nextFilters?: { levelId?: string; courseId?: string; keyword?: string }) {
    setLoading(true);
    try {
      const rows = await listTeacherStudents(nextFilters);
      setStudents(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    if (courseFilter && !filteredCourses.some((course) => course.id === courseFilter)) {
      setCourseFilter("");
    }
  }, [courseFilter, filteredCourses]);

  useEffect(() => {
    if (formCourses.length && !formCourses.some((course) => course.id === formCourseId)) {
      setFormCourseId(formCourses[0]?.id ?? "");
    }
  }, [formCourseId, formCourses]);

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    const nextKeyword = keywordDraft.trim();
    setKeyword(nextKeyword);
    await loadStudents({
      levelId: levelFilter || undefined,
      courseId: courseFilter || undefined,
      keyword: nextKeyword || undefined,
    });
  }

  async function handleReset() {
    setLevelFilter("");
    setCourseFilter("");
    setKeywordDraft("");
    setKeyword("");
    await loadStudents();
  }

  async function handleAddStudent(event: FormEvent) {
    event.preventDefault();
    if (!formCourseId || !studentDraft.name.trim() || !studentDraft.id.trim()) return;
    await addStudent(formCourseId, {
      id: studentDraft.id.trim(),
      name: studentDraft.name.trim(),
      major: studentDraft.major.trim(),
      className: studentDraft.className.trim(),
      contact: studentDraft.contact.trim(),
    });
    setStudentDraft({ name: "", id: "", major: "", className: "", contact: "" });
    setConfigMode("");
    await loadStudents({
      levelId: levelFilter || undefined,
      courseId: courseFilter || undefined,
      keyword: keyword || undefined,
    });
  }

  async function handleImportStudents(event: FormEvent) {
    event.preventDefault();
    if (!formCourseId || !batchDraft.trim()) return;
    await importStudents(formCourseId, batchDraft.trim());
    setBatchDraft("");
    setConfigMode("");
    await loadStudents({
      levelId: levelFilter || undefined,
      courseId: courseFilter || undefined,
      keyword: keyword || undefined,
    });
  }

  return (
    <div className="proto-wrap">
      <Breadcrumbs fallback={[{ label: "教师首页", to: "/" }]} current="学生列表" />

      <section className="proto-hero compact">
        <div className="proto-eyebrow">Teacher Students</div>
        <h1 className="proto-title">教师端学生列表</h1>
        <p className="proto-desc">
          这里汇总所有学段与课程下的学生信息，适合做统一检索与快速查看；添加学生与批量导入也集中在此处理。
        </p>
        <div className="proto-actions">
          <Link className="proto-btn" to="/">
            返回教师首页
          </Link>
        </div>
      </section>

      <section className="proto-section-card">
        <div className="proto-section-head">
          <div>
            <h2>检索与筛选</h2>
            <div className="proto-muted">支持查看全部学生，也可按学段、课程和姓名/学号进行检索。</div>
          </div>
        </div>
        <form className="proto-student-list-filters" onSubmit={handleSearch}>
          <select onChange={(event) => setLevelFilter(event.target.value)} value={levelFilter}>
            <option value="">全部学段</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          <select onChange={(event) => setCourseFilter(event.target.value)} value={courseFilter}>
            <option value="">全部课程</option>
            {filteredCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <input
            onChange={(event) => setKeywordDraft(event.target.value)}
            placeholder="搜索学生姓名或学号"
            type="search"
            value={keywordDraft}
          />
          <button className="proto-btn primary" type="submit">
            查询
          </button>
          <button className="proto-btn" onClick={() => void handleReset()} type="button">
            重置
          </button>
        </form>
      </section>

      <section className="proto-section-card">
        <div className="proto-section-head">
          <div>
            <h2>学生配置</h2>
            <div className="proto-muted">复用教师首页的零星添加与批量导入逻辑，但在这里需要明确选择学段与课程。</div>
          </div>
          <div className="proto-segment">
            <button className={configMode === "manual" ? "active" : ""} onClick={() => setConfigMode(configMode === "manual" ? "" : "manual")} type="button">
              添加学生
            </button>
            <button className={configMode === "batch" ? "active" : ""} onClick={() => setConfigMode(configMode === "batch" ? "" : "batch")} type="button">
              Excel 导入
            </button>
          </div>
        </div>

        {configMode === "manual" ? (
          <form className="proto-form-grid-page proto-single-column proto-student-list-form" onSubmit={handleAddStudent}>
            <div className="proto-field-grid">
              <div className="proto-field">
                <label>所属学段</label>
                <select onChange={(event) => setFormLevelId(event.target.value)} value={formLevelId}>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="proto-field">
                <label>所属课程</label>
                <select onChange={(event) => setFormCourseId(event.target.value)} value={formCourseId}>
                  {formCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="proto-field-grid proto-student-grid-fields">
              <div className="proto-field">
                <label>姓名</label>
                <input onChange={(event) => setStudentDraft((current) => ({ ...current, name: event.target.value }))} value={studentDraft.name} />
              </div>
              <div className="proto-field">
                <label>学号</label>
                <input onChange={(event) => setStudentDraft((current) => ({ ...current, id: event.target.value }))} value={studentDraft.id} />
              </div>
              <div className="proto-field">
                <label>专业</label>
                <input onChange={(event) => setStudentDraft((current) => ({ ...current, major: event.target.value }))} value={studentDraft.major} />
              </div>
              <div className="proto-field">
                <label>班级</label>
                <input onChange={(event) => setStudentDraft((current) => ({ ...current, className: event.target.value }))} value={studentDraft.className} />
              </div>
              <div className="proto-field">
                <label>联系方式</label>
                <input onChange={(event) => setStudentDraft((current) => ({ ...current, contact: event.target.value }))} value={studentDraft.contact} />
              </div>
            </div>
            <div className="proto-actions">
              <button className="proto-btn primary" type="submit">
                保存学生
              </button>
            </div>
          </form>
        ) : null}

        {configMode === "batch" ? (
          <form className="proto-form-grid-page proto-single-column proto-student-list-form" onSubmit={handleImportStudents}>
            <div className="proto-field-grid">
              <div className="proto-field">
                <label>所属学段</label>
                <select onChange={(event) => setFormLevelId(event.target.value)} value={formLevelId}>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="proto-field">
                <label>所属课程</label>
                <select onChange={(event) => setFormCourseId(event.target.value)} value={formCourseId}>
                  {formCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="proto-field">
              <label>批量导入内容</label>
              <textarea
                onChange={(event) => setBatchDraft(event.target.value)}
                placeholder={"姓名\t学号\t专业\t班级\t联系方式"}
                rows={7}
                value={batchDraft}
              />
            </div>
            <div className="proto-actions">
              <button className="proto-btn primary" type="submit">
                批量导入
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="proto-section-card">
        <div className="proto-section-head">
          <div>
            <h2>学生列表</h2>
            <div className="proto-muted">{loading ? "正在加载学生数据…" : `当前共展示 ${students.length} 位学生。`}</div>
          </div>
        </div>
        {students.length ? (
          <div className="proto-table-shell proto-table-shell-scroll">
            <table className="proto-table proto-student-all-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>学号</th>
                  <th>学段</th>
                  <th>课程</th>
                  <th>专业</th>
                  <th>班级</th>
                  <th>联系方式</th>
                  <th>成长路径</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={`${student.courseId}-${student.id}`}>
                    <td>{student.name}</td>
                    <td>{student.id}</td>
                    <td>{student.levelName}</td>
                    <td>{student.courseName}</td>
                    <td>{student.major || "未配置"}</td>
                    <td>{student.className || "未配置"}</td>
                    <td>{student.contact || "未配置"}</td>
                    <td>
                      <Link
                        className="proto-btn small"
                        state={createBreadcrumbState(location, "学生列表")}
                        to={`/teacher/courses/${student.courseId}/students/${student.id}/growth`}
                      >
                        查看成长路径
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="proto-empty">当前筛选条件下没有匹配学生。</div>
        )}
      </section>
    </div>
  );
}

