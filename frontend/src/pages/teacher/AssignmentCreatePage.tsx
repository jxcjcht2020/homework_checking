import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { createAssignment, getAssignment, getCourse, listCourses, listLevels, updateAssignment } from "../../lib/mock-db";

interface FormState {
  name: string;
  levelId: string;
  courseId: string;
  standardFileName: string;
  previewTitle: string;
  previewItemsText: string;
  previewParagraphsText: string;
}

interface ParsedPreview {
  previewTitle: string;
  previewItemsText: string;
  previewParagraphsText: string;
  hasMainChainFormat: boolean;
}

async function parseStandardPreview(file: File): Promise<ParsedPreview | null> {
  const lowerName = file.name.toLowerCase();
  if (!(lowerName.endsWith(".md") || lowerName.endsWith(".txt"))) {
    return {
      previewTitle: "主链条",
      previewItemsText: "",
      previewParagraphsText: "当前文件格式暂不支持前端自动提取主链条预览，请以后端解析结果为准。",
      hasMainChainFormat: false,
    };
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const firstTitleIndex = lines.findIndex((line) => /^#\s+/.test(line.trim()));
  const hasMainChainFormat = firstTitleIndex >= 0;
  const previewTitle = hasMainChainFormat ? lines[firstTitleIndex].replace(/^#\s+/, "").trim() : "主链条";
  const nextTitleIndex = hasMainChainFormat
    ? lines.findIndex((line, index) => index > firstTitleIndex && /^#\s+/.test(line.trim()))
    : -1;
  const scopedLines = hasMainChainFormat
    ? lines.slice(firstTitleIndex + 1, nextTitleIndex >= 0 ? nextTitleIndex : lines.length)
    : lines;

  const items = scopedLines
    .filter((line) => /^\s*[-*]\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
  const paragraphs = scopedLines
    .map((line) => line.trim())
    .filter((line) => line && !/^#/.test(line) && !/^\s*[-*]\s+/.test(line))
    .slice(0, 4);

  return {
    previewTitle,
    previewItemsText: items.join("\n"),
    previewParagraphsText: paragraphs.join("\n"),
    hasMainChainFormat,
  };
}

export function AssignmentCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const levels = listLevels();
  const editId = searchParams.get("editId") || "";
  const courseIdFromQuery = searchParams.get("courseId") || "";
  const editingAssignment = editId ? getAssignment(editId) : null;

  const [alert, setAlert] = useState<{ type: "warn" | "ok"; message: string } | null>(null);
  const [standardFile, setStandardFile] = useState<File | null>(null);
  const [hasMainChainFormat, setHasMainChainFormat] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialLevelId = useMemo(() => {
    if (editingAssignment) return editingAssignment.levelId;
    if (courseIdFromQuery) return getCourse(courseIdFromQuery)?.levelId ?? "graduate";
    return "graduate";
  }, [courseIdFromQuery, editingAssignment]);

  const [form, setForm] = useState<FormState>({
    name: "",
    levelId: initialLevelId,
    courseId: courseIdFromQuery,
    standardFileName: "",
    previewTitle: "主链条",
    previewItemsText: "",
    previewParagraphsText: "当前尚未读取标准文件内容。若上传 Markdown 或 TXT，系统将优先提取第一个一级标题及其对应内容。",
  });

  useEffect(() => {
    if (!editingAssignment) return;
    setForm({
      name: editingAssignment.name,
      levelId: editingAssignment.levelId,
      courseId: editingAssignment.courseId,
      standardFileName: editingAssignment.standardFileName,
      previewTitle: editingAssignment.standardPreview.title,
      previewItemsText: editingAssignment.standardPreview.items.join("\n"),
      previewParagraphsText: editingAssignment.standardPreview.paragraphs.join("\n"),
    });
    setHasMainChainFormat(Boolean(editingAssignment.standardPreview.title && editingAssignment.standardPreview.title.trim()));
  }, [editingAssignment]);

  const courses = listCourses(form.levelId);

  useEffect(() => {
    if (!courses.length) return;
    if (!courses.some((course) => course.id === form.courseId)) {
      setForm((current) => ({ ...current, courseId: courses[0].id }));
    }
  }, [courses, form.courseId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleStandardFileSelect(file: File | null) {
    setStandardFile(file);
    setShowConfirmModal(false);
    if (!file) {
      setHasMainChainFormat(Boolean(editingAssignment));
      setForm((current) => ({
        ...current,
        standardFileName: editingAssignment?.standardFileName ?? "",
      }));
      return;
    }

    setForm((current) => ({ ...current, standardFileName: file.name }));
    const parsed = await parseStandardPreview(file);
    if (!parsed) return;

    setHasMainChainFormat(parsed.hasMainChainFormat);
    setForm((current) => ({
      ...current,
      standardFileName: file.name,
      previewTitle: parsed.previewTitle || current.previewTitle,
      previewItemsText: parsed.previewItemsText,
      previewParagraphsText: parsed.previewParagraphsText || current.previewParagraphsText,
    }));
  }

  async function publishAssignment(forceContinue = false) {
    if (!form.name.trim()) {
      setAlert({ type: "warn", message: "请先填写作业名称。" });
      return;
    }
    if (!editingAssignment && !standardFile) {
      setAlert({ type: "warn", message: "请上传作业评价标准文件。" });
      return;
    }
    if (!forceContinue && standardFile && !hasMainChainFormat) {
      setShowConfirmModal(true);
      return;
    }

    const payload = {
      name: form.name.trim(),
      levelId: form.levelId,
      courseId: form.courseId,
      createdAt: editingAssignment?.createdAt ?? new Date().toISOString().slice(0, 10),
      standardFileName: form.standardFileName || editingAssignment?.standardFileName || "",
      standardFile,
      standardPreview: {
        title: form.previewTitle || "主链条",
        items: form.previewItemsText
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        paragraphs: form.previewParagraphsText
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
      },
      collectionOpen: editingAssignment?.collectionOpen ?? true,
    };

    try {
      setSubmitting(true);
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, payload);
        setAlert({ type: "ok", message: `作业“${payload.name}”已更新，正在返回作业列表页。` });
      } else {
        await createAssignment(payload);
        setAlert({ type: "ok", message: `作业“${payload.name}”已发布，正在返回作业列表页。` });
      }
      setShowConfirmModal(false);
      window.setTimeout(() => navigate("/teacher/assignments"), 700);
    } catch (error) {
      setAlert({
        type: "warn",
        message: error instanceof Error ? error.message : "发布失败，请稍后重试。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await publishAssignment(false);
  }

  return (
    <div className="proto-narrow-wrap">
      <Breadcrumbs
        fallback={[
          { label: "教师首页", to: "/" },
          { label: "作业列表", to: "/teacher/assignments" },
        ]}
        current={editingAssignment ? "编辑作业" : "发布作业"}
      />
      <div className="proto-form-panel">
        <div className="proto-eyebrow">Teacher Publish</div>
        <h1 className="proto-title">{editingAssignment ? "编辑作业" : "发布作业"}</h1>
        <p className="proto-desc">
          {editingAssignment
            ? "当前处于编辑模式。可修改作业名称、所属学段、所属课程和标准文件；若不重新上传标准文件，则沿用原文件。"
            : "填写作业名称、所属学段与课程，并上传作业评价标准文件。若上传 UTF-8 编码 Markdown 或 TXT，系统仅提取第一个一级标题及其对应内容作为预览。"}
        </p>

        <div className="proto-actions">
          <Link className="proto-btn" to="/">
            返回教师首页
          </Link>
          <Link className="proto-btn" to="/teacher/assignments">
            返回作业列表
          </Link>
        </div>

        <form className="proto-form" onSubmit={handleSubmit}>
          <div className="proto-field">
            <label>作业名称</label>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="请输入作业名称" />
          </div>

          <div className="proto-field">
            <label>所属学段</label>
            <select value={form.levelId} onChange={(event) => setField("levelId", event.target.value)}>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          <div className="proto-field">
            <label>所属课程</label>
            <select value={form.courseId} onChange={(event) => setField("courseId", event.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="proto-field">
            <label>上传作业评价标准</label>
            <input
              accept=".md,.txt,.doc,.docx,.pdf,.ipynb"
              onChange={(event) => void handleStandardFileSelect(event.target.files?.[0] ?? null)}
              type="file"
            />
            <div className="proto-muted">当前文件：{form.standardFileName || editingAssignment?.standardFileName || "未选择文件"}</div>
            <div className="proto-muted">标准预览只提取第一个一级标题及其对应内容，不继续读取后续标题章节。</div>
          </div>

          <div className="proto-preview-panel">
            <h3>{form.previewTitle || "主链条预览"}</h3>
            <div className="proto-field">
              <label>首标题</label>
              <input value={form.previewTitle} onChange={(event) => setField("previewTitle", event.target.value)} />
            </div>
            <div className="proto-field">
              <label>要点列表</label>
              <textarea
                rows={6}
                value={form.previewItemsText}
                onChange={(event) => setField("previewItemsText", event.target.value)}
                placeholder="每行一条主链条要点"
              />
            </div>
            <div className="proto-field">
              <label>说明段落</label>
              <textarea
                rows={5}
                value={form.previewParagraphsText}
                onChange={(event) => setField("previewParagraphsText", event.target.value)}
                placeholder="输入首标题下的正文摘要"
              />
            </div>
          </div>

          <div className="proto-actions">
            <button className="proto-btn primary" disabled={submitting} type="submit">
              {submitting ? "处理中…" : editingAssignment ? "保存修改" : "确认发布"}
            </button>
          </div>
        </form>

        {alert ? <div className={`proto-alert ${alert.type}`}>{alert.message}</div> : null}
      </div>

      {showConfirmModal ? (
        <div className="proto-modal-overlay" role="presentation">
          <div className="proto-modal-card">
            <button
              aria-label="关闭"
              className="proto-floating-close"
              onClick={() => setShowConfirmModal(false)}
              type="button"
            >
              ×
            </button>
            <div className="proto-modal-eyebrow">提示</div>
            <h3>未检测到作业评价标准主链条</h3>
            <p>建议检查评价标准上传是否有误。如需继续发布，请点击继续按钮。</p>
            <div className="proto-actions">
              <button className="proto-btn primary" onClick={() => void publishAssignment(true)} type="button">
                继续
              </button>
              <button className="proto-btn" onClick={() => setShowConfirmModal(false)} type="button">
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
