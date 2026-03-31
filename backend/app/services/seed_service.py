from app.core.security import hash_password
from app.models import Assignment, Course, CourseStudent, Level, Review, Submission, User


def seed_reference_data(db) -> None:
    if db.query(Level).count() > 0:
        return

    db.add_all(
        [
            Level(id="undergraduate", name="本科生"),
            Level(id="graduate", name="研究生"),
            Level(id="doctor", name="博士生"),
        ]
    )

    teacher = User(
        role="teacher",
        name="张老师",
        contact="13800000011",
        worker_id="T10001",
        password_hash=hash_password("Test@123"),
    )
    student_a = User(
        role="student",
        name="吕翔",
        contact="13800000001",
        student_id="202511040167",
        password_hash=hash_password("Test@123"),
    )
    student_b = User(
        role="student",
        name="王依梦",
        contact="13800000002",
        student_id="202511040168",
        password_hash=hash_password("Test@123"),
    )
    db.add_all([teacher, student_a, student_b])
    db.flush()

    db.add_all(
        [
            Course(id="ug_finance_intro", level_id="undergraduate", name="金融基础导论"),
            Course(id="grad_derivatives", level_id="graduate", name="金融创新与衍生品专题"),
            Course(id="phd_research_method", level_id="doctor", name="金融工程研究方法"),
        ]
    )
    db.flush()

    db.add_all(
        [
            CourseStudent(
                course_id="grad_derivatives",
                student_user_id=student_a.id,
                major="金融工程",
                class_name="金融工程硕士1班",
                contact_snapshot=student_a.contact,
            ),
            CourseStudent(
                course_id="grad_derivatives",
                student_user_id=student_b.id,
                major="金融工程",
                class_name="金融工程硕士1班",
                contact_snapshot=student_b.contact,
            ),
        ]
    )

    assignment = Assignment(
        id="assignment_inventory_default",
        course_id="grad_derivatives",
        name="大宗商品库存分析作业",
        created_at="2026-03-26",
        standard_file_name="大宗商品库存分析标准.md",
        standard_preview={
            "title": "主链条",
            "items": [
                "定义研究对象与库存口径",
                "画出产业链与库存分布",
                "建立供需平衡表",
                "分析供给与需求两端驱动",
                "用现货流动性验证结论",
            ],
            "paragraphs": [
                "本次作业优先考察库存分析主链条是否闭合，再判断扩展变量和自主框架是否真正增强了结论。"
            ],
        },
        collection_open=True,
        submitted_count=2,
        graded_count=2,
    )
    db.add(assignment)
    db.flush()

    submission_a = Submission(
        id="submission_lvx_default",
        student_user_id=student_a.id,
        assignment_id=assignment.id,
        course_id="grad_derivatives",
        file_name="吕翔_铜产业库存周期量化归因分析.docx",
        submitted_at="2026-03-26 11:20",
        status="graded",
    )
    submission_b = Submission(
        id="submission_wym_default",
        student_user_id=student_b.id,
        assignment_id=assignment.id,
        course_id="grad_derivatives",
        file_name="王依梦_钢铁行业库存周期分析.docx",
        submitted_at="2026-03-26 11:42",
        status="graded",
    )
    db.add_all([submission_a, submission_b])
    db.flush()

    db.add_all(
        [
            Review(
                id="review_lvx_20260326",
                submission_id=submission_a.id,
                student_user_id=student_a.id,
                assignment_id=assignment.id,
                course_id="grad_derivatives",
                student_name="吕翔",
                assignment_name=assignment.name,
                course_title="金融创新与衍生品专题",
                review_date="2026-03-26",
                title="基于多维数据的铜产业库存周期量化归因分析",
                tag="方法意识较强，但库存分析主线偏弱",
                summary="文章结构较完整，但将交易所库存外推为产业库存周期，证据口径与结论范围不匹配。",
                scores={"logic": 58, "academic": 74, "consistency": 60, "standard": 45},
                dimension_scores={
                    "logicAnalysis": 58,
                    "academicWriting": 74,
                    "consistency": 60,
                    "standardExecution": 45,
                    "researchDepth": 63,
                    "independentThinking": 69,
                },
                overall_comment="作业具有较好的方法意识和章节组织能力，但真正落到库存分析时，研究对象的口径仍然偏窄，导致结论外推过快。",
                academic_comment="语言总体规范，但仍需进一步压低结论措辞强度。",
                consistency_comment="前文和结论之间仍存在一定外推。",
                standard_comment="未完整完成库存分析主链条。",
                suggestions=["明确库存口径。", "补足供需平衡表。", "加入现货与基差验证。"],
                matrix=[
                    {"step": "定义研究对象与库存口径", "status": "partial", "note": "品种清晰，但库存口径说明不足。"},
                    {"step": "画出产业链与库存分布", "status": "missing", "note": "未系统展开库存分布。"},
                ],
                markdown_content="# 吕翔 作业评语\n\n整体方法意识较强，但库存分析主链尚未闭合。",
            ),
            Review(
                id="review_wym_20260326",
                submission_id=submission_b.id,
                student_user_id=student_b.id,
                assignment_id=assignment.id,
                course_id="grad_derivatives",
                student_name="王依梦",
                assignment_name=assignment.name,
                course_title="金融创新与衍生品专题",
                review_date="2026-03-26",
                title="钢铁行业库存周期分析：供需变动、阶段识别与驱动机制研究",
                tag="主题贴合度较高，但库存证据链未闭合",
                summary="文章方向更贴近库存周期主题，但库存口径缺失，且计量变量标注与文字解释存在疑点。",
                scores={"logic": 62, "academic": 72, "consistency": 59, "standard": 55},
                dimension_scores={
                    "logicAnalysis": 62,
                    "academicWriting": 72,
                    "consistency": 59,
                    "standardExecution": 55,
                    "researchDepth": 67,
                    "independentThinking": 66,
                },
                overall_comment="选题方向准确，但库存尚未真正落实为一个具有明确口径和明确位置的研究对象。",
                academic_comment="四阶段逻辑概括较为清晰，但措辞力度仍偏强。",
                consistency_comment="前文与后文对于价格和库存关系的解释存在冲突。",
                standard_comment="库存口径、产业链与现货验证仍未形成完整证据链。",
                suggestions=["明确库存口径差异。", "补出产业链和平衡表。", "修正计量变量命名。"],
                matrix=[
                    {"step": "定义研究对象与库存口径", "status": "missing", "note": "库存口径未明确定义。"},
                    {"step": "建立供需平衡表", "status": "missing", "note": "没有将库存变化放回供需平衡框架。"},
                ],
                markdown_content="# 王依梦 作业评语\n\n选题方向准确，但库存分析证据链仍有明显缺口。",
            ),
        ]
    )
    db.commit()
