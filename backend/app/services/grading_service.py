from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from urllib import error, request

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Assignment, Review, Submission, User
from app.db.session import SessionLocal
from app.services.extraction_service import extract_homework_text
from app.services.storage_service import read_text_if_possible


DEFAULT_STANDARD_STEPS = [
    "Define target object and inventory scope",
    "Map industry chain and inventory distribution",
    "Build supply-demand balance sheet",
    "Analyze supply-side drivers",
    "Analyze demand-side drivers",
    "Track inventory total and structure",
    "Add time dimension and seasonality",
    "Validate with spot indicators",
    "Identify marginal changes and expectation gap",
    "Output price view and risk scenarios",
]


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _review_output_dir(assignment: Assignment, student: User) -> Path:
    student_key = student.student_id or student.id
    return settings.reviews_dir / assignment.course_id / assignment.id / student_key


def _get_standard_steps(assignment: Assignment) -> list[str]:
    preview = assignment.standard_preview or {}
    items = [str(item).strip() for item in preview.get("items", []) if str(item).strip()]
    return items or DEFAULT_STANDARD_STEPS


def _get_standard_text(assignment: Assignment) -> str:
    preview = assignment.standard_preview or {}
    chunks: list[str] = []
    if preview.get("title"):
        chunks.append(f"Title: {preview['title']}")
    if preview.get("items"):
        chunks.append("Steps:\n" + "\n".join(f"- {item}" for item in preview["items"]))
    if preview.get("paragraphs"):
        chunks.append("Notes:\n" + "\n".join(str(item) for item in preview["paragraphs"]))
    if assignment.standard_file_path:
        raw_text = read_text_if_possible(assignment.standard_file_path)
        if raw_text.strip():
            chunks.append("Raw Standard:\n" + raw_text.strip())
    return "\n\n".join(chunks).strip()


def _truncate(text: str, limit: int) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit] + " ..."


def _extract_json_block(raw_text: str) -> dict | None:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.S)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def _safe_int(value: object, default: int) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _normalize_score(value: object, default: int) -> int:
    return max(35, min(95, _safe_int(value, default)))


def _dimension_scores_from_scores(scores: dict[str, int], extras: dict | None = None) -> dict[str, int]:
    extras = extras or {}
    return {
        "logicAnalysis": _normalize_score(extras.get("logicAnalysis"), scores["logic"]),
        "academicWriting": _normalize_score(extras.get("academicWriting"), scores["academic"]),
        "consistency": _normalize_score(extras.get("consistency"), scores["consistency"]),
        "standardExecution": _normalize_score(extras.get("standardExecution"), scores["standard"]),
        "researchDepth": _normalize_score(extras.get("researchDepth"), max(scores["logic"], scores["standard"])),
        "independentThinking": _normalize_score(
            extras.get("independentThinking"), int((scores["logic"] + scores["academic"]) / 2)
        ),
    }


def _build_markdown(course_title: str, assignment_name: str, student_name: str, student_id: str, payload: dict) -> str:
    return (
        f"# 《{course_title}》作业评语\n\n"
        f"学生姓名：{student_name}\n"
        f"学号：{student_id}\n"
        f"作业题目：{assignment_name}\n"
        f"批改时间：{payload['review_date']}\n\n"
        "## 一、整体评价\n"
        f"{payload['overall_comment']}\n\n"
        "## 二、学术化语言评价\n"
        f"{payload['academic_comment']}\n\n"
        "## 三、按照分析标准的专业评价\n"
        f"{payload['standard_comment']}\n\n"
        "## 四、结语\n"
        f"{payload['summary']}\n"
    )


def _mock_payload(submission: Submission, assignment: Assignment, student: User, extracted_text: str) -> dict:
    seed = (len(student.name) + len(assignment.name) + len(extracted_text[:200])) % 8
    scores = {
        "logic": 62 + seed,
        "academic": 68 + seed,
        "consistency": 61 + seed,
        "standard": 60 + seed,
    }
    dimension_scores = _dimension_scores_from_scores(
        scores,
        {
            "researchDepth": 64 + seed,
            "independentThinking": 66 + seed,
        },
    )
    return {
        "review_date": _today(),
        "title": f"{assignment.name}批改结果",
        "tag": "结构已初步形成，但核心证据链仍需继续压实。",
        "summary": "当前为回退批改结果。系统已接通即时批改链路，但本次模型调用未返回可解析内容，故使用本地兜底逻辑生成评语。",
        "scores": scores,
        "dimension_scores": dimension_scores,
        "overall_comment": "作业已形成基础分析框架，但论证仍需进一步回到分析标准的主链条，并增强关键证据支撑。",
        "academic_comment": "文字表达总体规范，但结论强度与证据强度之间仍需继续收紧，以避免外推过快。",
        "consistency_comment": "前文分析与最终判断已经具备基本衔接，但个别推断仍需要更明确的中间论证。",
        "standard_comment": "库存分析的关键步骤已有覆盖，但现货验证、边际变化与情景推演仍是主要缺口。",
        "suggestions": [
            "进一步明确研究对象与库存口径。",
            "将库存变化放回供需平衡框架中重建主线。",
            "补充现货验证与预期差分析。",
        ],
    }


def _build_prompt_payload(assignment: Assignment, student: User, extracted_text: str) -> dict:
    standard_steps = _get_standard_steps(assignment)
    standard_text = _get_standard_text(assignment)
    course_title = assignment.course.name if assignment.course else ""

    system_prompt = (
        "You are a finance professor grading a master's level assignment on financial innovation and derivatives. "
        "Return only valid JSON. Do not use markdown fences. Be strict, evidence-based, and professional. "
        "The review must be single-student only, with no comparison to classmates. "
        "Narrative tone should be academic and concise."
    )
    user_prompt = f"""
请根据以下标准与作业内容，生成结构化批改结果。只返回 JSON，不要返回其他解释文字。

课程：{course_title}
作业：{assignment.name}
学生：{student.name}
学号：{student.student_id or student.id}

分析标准：
{standard_text or "未提供完整标准原文，请至少依据标题与步骤完成批改。"}

标准步骤：
{json.dumps(standard_steps, ensure_ascii=False)}

作业正文：
{_truncate(extracted_text, 18000) or "未能成功提取作业正文，请结合文件名和标准给出保守批改。"}

请按以下 JSON 结构输出：
{{
  "title": "字符串",
  "tag": "一句话总体标签",
  "summary": "2-4句总结",
  "scores": {{
    "logic": 0,
    "academic": 0,
    "consistency": 0,
    "standard": 0
  }},
  "dimension_scores": {{
    "logicAnalysis": 0,
    "academicWriting": 0,
    "consistency": 0,
    "standardExecution": 0,
    "researchDepth": 0,
    "independentThinking": 0
  }},
  "overall_comment": "整体评价",
  "academic_comment": "学术化语言评价",
  "consistency_comment": "前文与结论一致性评价",
  "standard_comment": "按分析标准的专业评价",
  "suggestions": ["建议1", "建议2", "建议3"],
  "matrix": [
    {{
      "step": "标准步骤名称",
      "status": "completed 或 partial 或 missing",
      "note": "该步骤的简短判断"
    }}
  ]
}}

要求：
1. 四项 scores 和六项 dimension_scores 使用 0-100 的整数。
2. matrix 必须覆盖全部标准步骤，每个步骤只能出现一次。
3. 如果作业证据不足，不要强行给高分。
4. 所有结论必须尽量基于作业正文和标准，而不是空泛评价。
""".strip()
    return {
        "system": system_prompt,
        "user": user_prompt,
    }


def _call_dashscope(payload: dict) -> dict:
    if not (settings.model_api_key and settings.model_base_url and settings.model_name):
        raise RuntimeError("Model provider configuration is incomplete.")

    endpoint = settings.model_base_url.rstrip("/") + "/v1/messages"
    body = {
        "model": settings.model_name,
        "max_tokens": 3200,
        "stream": False,
        "temperature": 0.2,
        "system": payload["system"],
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": payload["user"],
                    }
                ],
            }
        ],
    }
    req = request.Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": settings.model_api_key,
            "Authorization": f"Bearer {settings.model_api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=120) as resp:
            response_text = resp.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Model request failed: HTTP {exc.code} {detail}") from exc
    except Exception as exc:
        raise RuntimeError(f"Model request failed: {exc}") from exc

    data = json.loads(response_text)
    content = data.get("content", [])
    text_parts: list[str] = []
    for item in content:
        if isinstance(item, dict) and item.get("type") == "text":
            text_parts.append(item.get("text", ""))
    parsed = _extract_json_block("\n".join(text_parts))
    if not parsed:
        raise RuntimeError("Model returned no parseable JSON payload.")
    return parsed


def _normalize_payload(raw: dict, assignment: Assignment, student: User, extracted_text: str) -> dict:
    fallback = _mock_payload(submission=None, assignment=assignment, student=student, extracted_text=extracted_text)  # type: ignore[arg-type]
    scores_raw = raw.get("scores") if isinstance(raw.get("scores"), dict) else {}
    scores = {
        "logic": _normalize_score(scores_raw.get("logic"), fallback["scores"]["logic"]),
        "academic": _normalize_score(scores_raw.get("academic"), fallback["scores"]["academic"]),
        "consistency": _normalize_score(scores_raw.get("consistency"), fallback["scores"]["consistency"]),
        "standard": _normalize_score(scores_raw.get("standard"), fallback["scores"]["standard"]),
    }
    dimension_scores = _dimension_scores_from_scores(scores, raw.get("dimension_scores") if isinstance(raw.get("dimension_scores"), dict) else {})

    standard_steps = _get_standard_steps(assignment)
    matrix_raw = raw.get("matrix") if isinstance(raw.get("matrix"), list) else []
    matrix_by_step: dict[str, dict] = {}
    for item in matrix_raw:
        if not isinstance(item, dict):
            continue
        step = str(item.get("step", "")).strip()
        if step:
            matrix_by_step[step] = item
    matrix = []
    for step in standard_steps:
        item = matrix_by_step.get(step, {})
        status = str(item.get("status", "partial")).strip().lower()
        if status not in {"completed", "partial", "missing"}:
            status = "partial"
        note = str(item.get("note", "")).strip() or "该步骤已有一定涉及，但仍需进一步压实。"
        matrix.append({"step": step, "status": status, "note": note})

    review_date = _today()
    course_title = assignment.course.name if assignment.course else ""
    payload = {
        "review_date": review_date,
        "title": str(raw.get("title", "")).strip() or f"{assignment.name}批改结果",
        "tag": str(raw.get("tag", "")).strip() or fallback["tag"],
        "summary": str(raw.get("summary", "")).strip() or fallback["summary"],
        "scores": scores,
        "dimension_scores": dimension_scores,
        "overall_comment": str(raw.get("overall_comment", "")).strip() or fallback["overall_comment"],
        "academic_comment": str(raw.get("academic_comment", "")).strip() or fallback["academic_comment"],
        "consistency_comment": str(raw.get("consistency_comment", "")).strip() or fallback["consistency_comment"],
        "standard_comment": str(raw.get("standard_comment", "")).strip() or fallback["standard_comment"],
        "suggestions": [str(item).strip() for item in raw.get("suggestions", []) if str(item).strip()] or fallback["suggestions"],
        "matrix": matrix,
        "generation": {
            "mode": "provider",
            "provider": settings.model_provider,
            "model": settings.model_name,
            "skill_root": str(settings.homework_skill_root),
        },
        "identity": {
            "student_id": student.student_id or student.id,
            "student_name": student.name,
            "assignment_id": assignment.id,
            "assignment_name": assignment.name,
            "course_id": assignment.course_id,
            "course_title": course_title,
        },
    }
    payload["markdown_content"] = _build_markdown(
        course_title,
        assignment.name,
        student.name,
        student.student_id or student.id,
        payload,
    )
    return payload


def _generate_payload(submission: Submission, assignment: Assignment, student: User) -> tuple[dict, str]:
    extracted_text = extract_homework_text(submission.file_path)
    provider_ready = bool(
        settings.model_provider and settings.model_name and settings.model_api_key and settings.model_base_url
    )
    if settings.grading_mode == "skill" and provider_ready:
        try:
            raw = _call_dashscope(_build_prompt_payload(assignment, student, extracted_text))
            payload = _normalize_payload(raw, assignment, student, extracted_text)
            payload["summary"] += " 本次结果由在线模型即时生成。"
            return payload, extracted_text
        except Exception as exc:
            fallback = _mock_payload(submission, assignment, student, extracted_text)
            fallback["summary"] += f" 模型调用失败，已自动回退。失败原因：{exc}"
            fallback["generation"] = {
                "mode": "mock_fallback",
                "provider": settings.model_provider,
                "model": settings.model_name,
                "skill_root": str(settings.homework_skill_root),
            }
            fallback["identity"] = {
                "student_id": student.student_id or student.id,
                "student_name": student.name,
                "assignment_id": assignment.id,
                "assignment_name": assignment.name,
                "course_id": assignment.course_id,
                "course_title": assignment.course.name if assignment.course else "",
            }
            fallback["markdown_content"] = _build_markdown(
                assignment.course.name if assignment.course else "",
                assignment.name,
                student.name,
                student.student_id or student.id,
                {
                    **fallback,
                    "review_date": _today(),
                },
            )
            fallback["review_date"] = _today()
            fallback["title"] = f"{assignment.name}批改结果"
            fallback["matrix"] = [
                {"step": step, "status": "partial" if index < 5 else "missing", "note": "已触及该步骤，但证据仍需补强。"}
                for index, step in enumerate(_get_standard_steps(assignment))
            ]
            return fallback, extracted_text

    payload = _mock_payload(submission, assignment, student, extracted_text)
    payload["generation"] = {
        "mode": "mock",
        "provider": settings.model_provider,
        "model": settings.model_name,
        "skill_root": str(settings.homework_skill_root),
    }
    payload["identity"] = {
        "student_id": student.student_id or student.id,
        "student_name": student.name,
        "assignment_id": assignment.id,
        "assignment_name": assignment.name,
        "course_id": assignment.course_id,
        "course_title": assignment.course.name if assignment.course else "",
    }
    payload["review_date"] = _today()
    payload["title"] = f"{assignment.name}批改结果"
    payload["matrix"] = [
        {"step": step, "status": "completed" if index < 5 else "partial", "note": "Covered in the current grading output."}
        for index, step in enumerate(_get_standard_steps(assignment))
    ]
    payload["markdown_content"] = _build_markdown(
        assignment.course.name if assignment.course else "",
        assignment.name,
        student.name,
        student.student_id or student.id,
        payload,
    )
    return payload, extracted_text


def _render_report_html(payload: dict, assignment: Assignment, student: User) -> str:
    rows = "".join(
        f"<tr><td>{item['step']}</td><td>{item['status']}</td><td>{item['note']}</td></tr>" for item in payload["matrix"]
    )
    suggestion_items = "".join(f"<li>{item}</li>" for item in payload["suggestions"])
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>{assignment.name} - {student.name} 批改报告</title>
  <style>
    body {{ font-family: 'Microsoft YaHei', sans-serif; margin: 32px; color: #1e2b2f; background: #f8f3ec; }}
    .card {{ background: #fffdfa; border: 1px solid rgba(24,35,42,.08); border-radius: 18px; padding: 20px; margin-bottom: 16px; }}
    h1,h2 {{ margin: 0 0 12px; }}
    .grid {{ display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }}
    .pill {{ display:inline-block; padding:6px 10px; border-radius:999px; background:#e9f4f1; margin:0 8px 8px 0; }}
    table {{ width:100%; border-collapse: collapse; }}
    th,td {{ border-bottom:1px solid rgba(24,35,42,.08); text-align:left; padding:10px 8px; vertical-align: top; }}
    th {{ color:#607074; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>《{payload['identity']['course_title']}》作业批改报告</h1>
    <div>学生：{student.name} / {student.student_id or student.id}</div>
    <div>作业：{assignment.name}</div>
    <div>批改日期：{payload['review_date']}</div>
    <div style="margin-top:12px;"><span class="pill">{payload['tag']}</span></div>
  </div>
  <div class="card grid">
    <div><h2>整体评价</h2><p>{payload['overall_comment']}</p></div>
    <div><h2>学术语言</h2><p>{payload['academic_comment']}</p></div>
    <div><h2>一致性</h2><p>{payload['consistency_comment']}</p></div>
    <div><h2>标准执行</h2><p>{payload['standard_comment']}</p></div>
  </div>
  <div class="card">
    <h2>改进建议</h2>
    <ul>{suggestion_items}</ul>
  </div>
  <div class="card">
    <h2>标准执行矩阵</h2>
    <table>
      <thead><tr><th>步骤</th><th>状态</th><th>说明</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
</body>
</html>"""


def grade_submission(db: Session, submission: Submission, assignment: Assignment, student: User) -> Review:
    existing = (
        db.query(Review)
        .filter(Review.student_user_id == student.id, Review.assignment_id == assignment.id)
        .one_or_none()
    )

    payload, extracted_text = _generate_payload(submission, assignment, student)
    output_dir = _review_output_dir(assignment, student)
    output_dir.mkdir(parents=True, exist_ok=True)
    markdown_path = output_dir / "review.md"
    record_json_path = output_dir / "review-record.json"
    report_html_path = output_dir / "report.html"

    markdown_path.write_text(payload["markdown_content"], encoding="utf-8")
    report_html_path.write_text(_render_report_html(payload, assignment, student), encoding="utf-8")
    record_json_path.write_text(
        json.dumps(
            {
                "record_id": f"{assignment.id}__{student.student_id or student.id}",
                "student_key": student.student_id or student.id,
                "student_id": student.student_id or student.id,
                "name": student.name,
                "course_id": assignment.course_id,
                "course_title": assignment.course.name if assignment.course else "",
                "assignment_id": assignment.id,
                "assignment_name": assignment.name,
                "review_date": payload["review_date"],
                "tag": payload["tag"],
                "summary": payload["summary"],
                "scores": payload["scores"],
                "overallComment": payload["overall_comment"],
                "academicComment": payload["academic_comment"],
                "consistencyComment": payload["consistency_comment"],
                "standardComment": payload["standard_comment"],
                "suggestions": payload["suggestions"],
                "matrix": payload["matrix"],
                "standard": assignment.standard_preview,
                "generation": payload.get("generation", {}),
                "source": {
                    "submissionFileName": submission.file_name,
                    "submissionFilePath": submission.file_path,
                    "extractedTextLength": len(extracted_text),
                    "extractedTextPreview": _truncate(extracted_text, 600),
                },
                "growth": {
                    "dimensionScores": payload["dimension_scores"],
                    "growthNarrative": {
                        "teacherSummary": payload["summary"],
                        "studentSummary": payload["suggestions"][0],
                    },
                    "historyEntry": {
                        "assignmentName": assignment.name,
                        "date": payload["review_date"],
                        "tag": payload["tag"],
                        "logic": payload["scores"]["logic"],
                        "academic": payload["scores"]["academic"],
                        "consistency": payload["scores"]["consistency"],
                        "standard": payload["scores"]["standard"],
                    },
                },
                "artifacts": {
                    "markdownFilename": markdown_path.name,
                    "markdownPath": str(markdown_path),
                    "downloadName": f"{student.name}_{assignment.name}_作业评语.md",
                    "reportHtmlPath": str(report_html_path),
                    "recordJsonPath": str(record_json_path),
                },
                "markdownContent": payload["markdown_content"],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    review = existing or Review(
        submission_id=submission.id,
        student_user_id=student.id,
        assignment_id=assignment.id,
        course_id=assignment.course_id,
    )
    review.submission_id = submission.id
    review.student_name = student.name
    review.assignment_name = assignment.name
    review.course_title = assignment.course.name if assignment.course else ""
    review.review_date = payload["review_date"]
    review.title = payload["title"]
    review.tag = payload["tag"]
    review.summary = payload["summary"]
    review.scores = payload["scores"]
    review.dimension_scores = payload["dimension_scores"]
    review.overall_comment = payload["overall_comment"]
    review.academic_comment = payload["academic_comment"]
    review.consistency_comment = payload["consistency_comment"]
    review.standard_comment = payload["standard_comment"]
    review.suggestions = payload["suggestions"]
    review.matrix = payload["matrix"]
    review.markdown_content = payload["markdown_content"]
    review.markdown_path = str(markdown_path)
    review.record_json_path = str(record_json_path)
    review.report_html_path = str(report_html_path)
    if not existing:
        db.add(review)
    db.flush()
    return review


def grade_submission_job(submission_id: str) -> None:
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).one_or_none()
        if not submission:
            return
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).one_or_none()
        student = db.query(User).filter(User.id == submission.student_user_id).one_or_none()
        if not assignment or not student:
            submission.status = "failed"
            db.commit()
            return

        try:
            grade_submission(db, submission, assignment, student)
            submission.status = "graded"
        except Exception:
            submission.status = "failed"

        assignment.submitted_count = db.query(Submission).filter(Submission.assignment_id == assignment.id).count()
        assignment.graded_count = db.query(Review).filter(Review.assignment_id == assignment.id).count()
        db.commit()
    finally:
        db.close()
