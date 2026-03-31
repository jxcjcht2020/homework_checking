import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { GrowthVisualization, growthDimensionMeta } from "../../components/common/GrowthVisualization";
import { createBreadcrumbState } from "../../lib/navigation";
import { getCourse, getStudent, getStudentGrowth } from "../../lib/mock-db";

export function StudentGrowthPage() {
  const location = useLocation();
  const { courseId = "", studentId = "" } = useParams();
  const course = getCourse(courseId);
  const student = getStudent(courseId, studentId);
  const history = useMemo(() => getStudentGrowth(studentId), [studentId]);
  const [selectedIndex, setSelectedIndex] = useState(Math.max(history.length - 1, 0));
  const selected = history[selectedIndex];
  const previous = selectedIndex > 0 ? history[selectedIndex - 1] : null;

  function getDeltaLabel(delta: number) {
    if (delta >= 5) return { text: "明显进步", cls: "up" };
    if (delta >= 2) return { text: "稳步提升", cls: "up" };
    if (delta > -2) return { text: "保持稳定", cls: "flat" };
    return { text: "仍待补强", cls: "soft" };
  }

  function getCapabilityText(delta: number) {
    if (delta >= 5) return "较上一轮更清晰";
    if (delta >= 2) return "较上一轮更稳定";
    if (delta > -2) return "整体保持";
    return "建议继续补强";
  }

  if (!student) {
    return (
      <div className="proto-student-query-wrap">
        <Breadcrumbs fallback={[{ label: "教师首页", to: "/" }]} current="学生成长路径" />
        <section className="proto-hero compact">
          <div className="proto-eyebrow">Teacher Growth</div>
          <h1 className="proto-title">未找到学生成长路径</h1>
          <p className="proto-desc">请返回教师首页重新选择学生。</p>
          <div className="proto-actions">
            <Link className="proto-btn" to="/">
              返回教师首页
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="proto-growth-wrap">
      <Breadcrumbs fallback={[{ label: "教师首页", to: "/" }]} current="学生成长路径" />

      <section className="proto-hero compact">
        <div className="proto-eyebrow">Teacher Growth</div>
        <h1 className="proto-title">
          {student.name} · 学生成长路径
        </h1>
        <p className="proto-desc">
          这里把每次提交作业视为一个能力训练节点。默认展示最新一次作业形成的能力轮廓；点击任一作业节点后，可回溯查看该次作业对应的能力状态。
        </p>
        <div className="proto-actions">
          <Link className="proto-btn" to="/">
            返回教师首页
          </Link>
        </div>
      </section>

      <section className="proto-section-card proto-section-card-compact">
        <div className="proto-growth-main-grid">
          <div className="proto-growth-visual-panel">
            <div className="proto-growth-panel-head">
              <div>
                <h2>多维度能力变化</h2>
                <p>点击右侧任一作业节点，可回溯查看该次作业后的能力轮廓。点击图卡边缘区域或右上角按钮，可翻转为按作业展开的堆叠柱状图。</p>
              </div>
            </div>

            <GrowthVisualization
              history={history}
              onSelect={setSelectedIndex}
              selectedIndex={selectedIndex}
              showLegendStack
              showNumbers
            />
          </div>

          <div className="proto-growth-side-stack">
            <div className="proto-growth-summary-panel">
              <div className="proto-growth-panel-head">
                <div>
                  <h2>当前查看节点判断</h2>
                  <p>
                    {selected
                      ? previous
                        ? `当前查看“${selected.assignmentName}”后的能力状态。与上一轮作业相比，学生在结构把握、表达清晰度与标准执行上的变化已经可见。`
                        : `当前查看的是“${selected.assignmentName}”。这是该学生目前最早的成长节点，可视为后续能力变化的起点。`
                      : "当前没有可用于判断的作业节点。"}
                  </p>
                </div>
              </div>
              <div className="proto-summary-badges">
                {selected
                  ? growthDimensionMeta.map((item) => {
                      const currentValue = selected.dimensionScores[item.key];
                      const previousValue = previous ? previous.dimensionScores[item.key] : 50;
                      const delta = currentValue - previousValue;
                      const signal = getDeltaLabel(delta);
                      return (
                        <span className={`proto-signal ${signal.cls}`} key={item.key}>
                          {item.label}：{currentValue} · {signal.text}
                        </span>
                      );
                    })
                  : null}
              </div>
            </div>

            <div className="proto-growth-summary-panel">
              <div className="proto-growth-panel-head">
                <div>
                  <h2>学生基础信息</h2>
                  <p>用于教师确认当前查看对象、课程归属与作业训练背景。</p>
                </div>
              </div>
              <div className="proto-meta-list">
                <div>
                  <strong>姓名</strong>
                  {student.name}
                </div>
                <div>
                  <strong>学号</strong>
                  {student.id}
                </div>
                <div>
                  <strong>专业</strong>
                  {student.major}
                </div>
                <div>
                  <strong>班级</strong>
                  {student.className}
                </div>
                <div>
                  <strong>联系方式</strong>
                  {student.contact}
                </div>
                <div>
                  <strong>课程</strong>
                  {course?.name || "未找到课程"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proto-section-card proto-section-card-compact">
        <div className="proto-growth-panel-head">
          <div>
            <h2>历次作业后的成长节点</h2>
            <p>这里保留每次作业后的文字性成长印象，便于教师回看学生在不同阶段形成的能力画像。</p>
          </div>
        </div>
        <div className="proto-growth-timeline">
          {history.map((entry, index) => (
            <div
              aria-pressed={index === selectedIndex}
              className={`proto-timeline-card ${index === selectedIndex ? "selected" : ""}`}
              key={entry.reviewId}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedIndex(index);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="proto-timeline-head">
                <div>
                  <div className="proto-growth-step-index">第 {index + 1} 次作业</div>
                  <h3 style={{ marginTop: 10 }}>{entry.assignmentName}</h3>
                  <div className="proto-growth-step-date">
                    {entry.reviewDate} · {entry.tag}
                  </div>
                </div>
                <Link
                  className="proto-btn small"
                  onClick={(event) => event.stopPropagation()}
                  state={createBreadcrumbState(location, "学生成长路径")}
                  to={`/teacher/assignments/${entry.assignmentId}?studentId=${studentId}`}
                >
                  查看详情
                </Link>
              </div>
              <div className="proto-timeline-grid">
                {growthDimensionMeta.map((item) => {
                  const currentValue = entry.dimensionScores[item.key];
                  const previousValue = index > 0 ? history[index - 1].dimensionScores[item.key] : 50;
                  const delta = currentValue - previousValue;
                  return (
                    <div className="proto-mini-metric" key={item.key}>
                      <div className="proto-mini-metric-label">{item.label}</div>
                      <div className="proto-mini-metric-main">{getCapabilityText(delta)}</div>
                      <div className="proto-mini-metric-sub">
                        当前值 {currentValue}
                        {index > 0 ? ` · 较上一轮 ${delta >= 0 ? "+" : ""}${delta}` : " · 首个能力节点"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
