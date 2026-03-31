import type { AppDatabase } from "../types/domain";

export const statusMap = {
  completed: "完成",
  partial: "部分完成",
  missing: "缺失或明显不足",
} as const;

export const evaluationDirections = [
  {
    title: "整体逻辑与结论",
    description: "检查研究对象是否清楚、论证链条是否完整，以及最终结论是否得到前文证据的充分支持。",
  },
  {
    title: "学术化语言表达",
    description: "检查表述是否规范、措辞强度是否与证据强度匹配，以及是否存在概念混用或绝对化表达。",
  },
  {
    title: "前文分析与结论一致性",
    description: "检查数据描述、阶段划分、计量结果与最终判断之间是否存在跳步、外推或内部矛盾。",
  },
  {
    title: "专业标准执行与自主思考",
    description: "检查是否按照库存分析标准完成主链条，同时判断学生的自主框架是否真正增强了结论。",
  },
];

export const standardSteps = [
  "定义研究对象与库存口径",
  "画出产业链与库存分布",
  "建立供需平衡表",
  "分析供给端驱动",
  "分析需求端驱动",
  "跟踪库存总量与库存结构",
  "加入时间维度与季节性",
  "用现货流动性验证结论",
  "识别边际变化与预期差",
  "输出价格判断与风险情景",
];

export const seedDatabase: AppDatabase = {
  users: [
    {
      role: "teacher",
      name: "张老师",
      contact: "13800000011",
      workerId: "T10001",
      password: "Test@123",
    },
    {
      role: "student",
      name: "吕翔",
      contact: "13800000001",
      studentId: "202511040167",
      password: "Test@123",
    },
    {
      role: "student",
      name: "王依梦",
      contact: "13800000002",
      studentId: "202511040168",
      password: "Test@123",
    },
  ],
  levels: [
    { id: "undergraduate", name: "本科生" },
    { id: "graduate", name: "研究生" },
    { id: "doctor", name: "博士生" },
  ],
  courses: [
    { id: "ug_finance_intro", levelId: "undergraduate", name: "金融基础导论" },
    { id: "grad_derivatives", levelId: "graduate", name: "金融创新与衍生品专题" },
    { id: "phd_research_method", levelId: "doctor", name: "金融工程研究方法" },
  ],
  students: [
    {
      id: "202511040167",
      name: "吕翔",
      major: "金融工程",
      className: "金融工程硕士1班",
      contact: "13800000001",
      courseId: "grad_derivatives",
    },
    {
      id: "202511040168",
      name: "王依梦",
      major: "金融工程",
      className: "金融工程硕士1班",
      contact: "13800000002",
      courseId: "grad_derivatives",
    },
  ],
  assignments: [
    {
      id: "assignment_inventory_default",
      name: "大宗商品库存分析作业",
      levelId: "graduate",
      courseId: "grad_derivatives",
      createdAt: "2026-03-26",
      standardFileName: "大宗商品库存分析标准.md",
      standardPreview: {
        title: "主链条",
        items: [
          "定义研究对象与库存口径",
          "画出产业链与库存分布",
          "建立供需平衡表",
          "分析供给与需求两端驱动",
          "用现货流动性验证结论",
        ],
        paragraphs: [
          "本次作业优先考察库存分析主链条是否闭合，再判断扩展变量和自主框架是否真正增强了结论。",
        ],
      },
      collectionOpen: true,
      submittedCount: 2,
      gradedCount: 2,
    },
    {
      id: "assignment_case_extension",
      name: "库存周期阶段识别扩展作业",
      levelId: "graduate",
      courseId: "grad_derivatives",
      createdAt: "2026-03-18",
      standardFileName: "库存阶段识别标准.md",
      standardPreview: {
        title: "阶段识别",
        items: [
          "明确库存口径与样本边界",
          "划分库存周期阶段",
          "结合价格与现货变量验证",
        ],
        paragraphs: [
          "阶段识别只能建立在明确库存口径和可验证证据基础上，不能仅凭价格描述外推。",
        ],
      },
      collectionOpen: false,
      submittedCount: 2,
      gradedCount: 1,
    },
  ],
  reviews: [
    {
      id: "review_lvx_20260326",
      studentId: "202511040167",
      assignmentId: "assignment_inventory_default",
      courseId: "grad_derivatives",
      studentName: "吕翔",
      assignmentName: "大宗商品库存分析作业",
      courseTitle: "金融创新与衍生品专题",
      reviewDate: "2026-03-26",
      title: "基于多维数据的铜产业库存周期量化归因分析",
      tag: "方法意识较强，但库存分析主线偏弱",
      summary: "文章结构较完整，但将交易所库存外推为产业库存周期，证据口径与结论范围不匹配。",
      scores: { logic: 58, academic: 74, consistency: 60, standard: 45 },
      dimensionScores: {
        logicAnalysis: 58,
        academicWriting: 74,
        consistency: 60,
        standardExecution: 45,
        researchDepth: 63,
        independentThinking: 69,
      },
      overallComment:
        "作业具备较好的方法意识和章节组织能力，但真正落到库存分析时，研究对象的口径仍然偏窄，导致结论外推过快。",
      academicComment:
        "语言总体规范，接近正式课程报告写法，但仍需进一步压低结论措辞强度，使其与证据强度保持一致。",
      consistencyComment:
        "前文完成实证检验的主要是价格与库存之间的关系，而结论部分将多个外部变量一并写入主导框架，存在一定外推。",
      standardComment:
        "未完整完成“库存口径—产业链—供需平衡—库存结构—现货验证”的主链条，自主量化分析更适合作为增强模块，而不能替代底层框架。",
      suggestions: [
        "明确交易所库存与产业总库存、有效库存之间的关系。",
        "补足铜产业链与供需平衡表，使库存变化成为供需差额的结果项。",
        "加入基差、月差、仓单或区域价差等现货验证。",
      ],
      matrix: [
        { step: standardSteps[0], status: "partial", note: "品种清晰，但库存口径说明不足。" },
        { step: standardSteps[1], status: "missing", note: "未系统展开铜矿、冶炼、加工与终端之间的库存分布。" },
        { step: standardSteps[2], status: "missing", note: "缺少期初库存、产量、进口、消费、出口和期末库存框架。" },
        { step: standardSteps[3], status: "partial", note: "引用矿端与 TC/RC 变量，但未纳入统一样本验证。" },
        { step: standardSteps[4], status: "partial", note: "提及 PMI 与终端需求，但缺少清晰传导链。" },
        { step: standardSteps[5], status: "missing", note: "未区分总库存、有效库存和区域库存。" },
        { step: standardSteps[6], status: "partial", note: "做了阶段划分，但季节性判断仍不充分。" },
        { step: standardSteps[7], status: "missing", note: "缺少现货流动性验证。" },
        { step: standardSteps[8], status: "partial", note: "有边际变化意识，但未落实到预期差验证。" },
        { step: standardSteps[9], status: "partial", note: "提出了套保判断，但风险情景仍不够完整。" },
      ],
      markdownContent: "# 《金融创新与衍生品专题》作业评语\n\n学生姓名：吕翔\n作业题目：基于多维数据的铜产业库存周期量化归因分析\n批改时间：2026-03-26\n\n## 一、整体评价\n这份作业具有较强的方法意识，但库存分析主线尚未闭合。\n\n## 二、学术化语言评价\n文字表达较规范，但部分结论推进仍然偏快。\n\n## 三、按照分析标准的专业评价\n库存口径、产业链与现货验证仍需补足。\n\n## 四、结语\n建议先补底层框架，再叠加量化归因。",
    },
    {
      id: "review_wym_20260326",
      studentId: "202511040168",
      assignmentId: "assignment_inventory_default",
      courseId: "grad_derivatives",
      studentName: "王依梦",
      assignmentName: "大宗商品库存分析作业",
      courseTitle: "金融创新与衍生品专题",
      reviewDate: "2026-03-26",
      title: "钢铁行业库存周期分析：供需变动、阶段识别与驱动机制研究",
      tag: "主题贴合度较高，但库存证据链未闭合",
      summary: "文章方向更贴近库存周期主题，但库存口径缺失，且计量变量标注与文字解释存在疑点。",
      scores: { logic: 62, academic: 72, consistency: 59, standard: 55 },
      dimensionScores: {
        logicAnalysis: 62,
        academicWriting: 72,
        consistency: 59,
        standardExecution: 55,
        researchDepth: 67,
        independentThinking: 66,
      },
      overallComment:
        "选题方向准确，能够围绕钢铁库存周期展开讨论，但库存尚未真正落实为一个具有明确口径和明确位置的研究对象。",
      academicComment:
        "四阶段逻辑概括较为清楚，但“完全吻合”“验证了机制”等措辞力度偏强，需回到更稳健的学术表达。",
      consistencyComment:
        "前文强调价格上行对应库存下降逻辑，后文回归却给出价格滞后一期与库存速度正相关，需进一步解释或修正变量标签。",
      standardComment:
        "阶段框架已有基础，但库存口径、产业链、供需平衡表、库存结构与现货验证仍未形成完整证据链。",
      suggestions: [
        "明确钢厂库存、社会库存、原料库存与成材库存的口径差异。",
        "补出铁矿、焦煤、焦炭、粗钢与成材的产业链与平衡表。",
        "修正计量部分的变量命名和文字解释口径。",
      ],
      matrix: [
        { step: standardSteps[0], status: "missing", note: "库存口径未明确界定。" },
        { step: standardSteps[1], status: "partial", note: "有阶段叙事，但未系统分解各环节库存。" },
        { step: standardSteps[2], status: "missing", note: "没有将库存变化放回供需平衡框架。" },
        { step: standardSteps[3], status: "partial", note: "提及利润与产量，但驱动拆解仍偏粗。" },
        { step: standardSteps[4], status: "partial", note: "提及需求回暖，但终端消费链条不充分。" },
        { step: standardSteps[5], status: "missing", note: "未区分社会库存与钢厂库存等结构差异。" },
        { step: standardSteps[6], status: "partial", note: "有周期回顾，但时间维度仍不严谨。" },
        { step: standardSteps[7], status: "missing", note: "缺少基差、月差、仓单等验证。" },
        { step: standardSteps[8], status: "partial", note: "有边际变化意识，但预期差仍不明晰。" },
        { step: standardSteps[9], status: "partial", note: "给出阶段判断，但风险情景不够完整。" },
      ],
      markdownContent: "# 《金融创新与衍生品专题》作业评语\n\n学生姓名：王依梦\n作业题目：钢铁行业库存周期分析：供需变动、阶段识别与驱动机制研究\n批改时间：2026-03-26\n\n## 一、整体评价\n选题方向准确，但库存分析证据链仍有明显缺口。\n\n## 二、学术化语言评价\n表述较稳，但部分结论力度偏强。\n\n## 三、按照分析标准的专业评价\n库存口径、平衡表和现货验证仍需补足。\n\n## 四、结语\n建议把库存分析真正落实到产业链和实体库存层面。",
    },
  ],
  submissions: [
    {
      id: "submission_lvx_default",
      studentId: "202511040167",
      assignmentId: "assignment_inventory_default",
      courseId: "grad_derivatives",
      fileName: "吕翔_铜产业库存周期量化归因分析.docx",
      submittedAt: "2026-03-26 11:20",
    },
    {
      id: "submission_wym_default",
      studentId: "202511040168",
      assignmentId: "assignment_inventory_default",
      courseId: "grad_derivatives",
      fileName: "王依梦_钢铁行业库存周期分析.docx",
      submittedAt: "2026-03-26 11:42",
    },
  ],
};
