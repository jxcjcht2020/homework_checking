import { useMemo, useState, type MouseEvent } from "react";
import type { DimensionScores, GrowthHistoryEntry } from "../../types/domain";

type GrowthDimensionKey = keyof DimensionScores;

interface GrowthDimensionMeta {
  key: GrowthDimensionKey;
  label: string;
}

interface GrowthDimensionValue {
  key: GrowthDimensionKey;
  label: string;
  value: number;
}

interface GrowthVisualizationProps {
  history: GrowthHistoryEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  showNumbers?: boolean;
  showLegendStack?: boolean;
}

export const growthDimensionMeta: GrowthDimensionMeta[] = [
  { key: "logicAnalysis", label: "逻辑分析" },
  { key: "academicWriting", label: "学术表达" },
  { key: "consistency", label: "论证一致性" },
  { key: "standardExecution", label: "标准执行" },
  { key: "researchDepth", label: "研究深化" },
  { key: "independentThinking", label: "自主思考" },
];

export const growthPalette = ["#0c6a78", "#2f7d5c", "#a27a33", "#c86f4e", "#7068b2", "#4b83b0"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgba(hex: string, alpha: number) {
  const clean = String(hex || "#2f7d5c")
    .replace("#", "")
    .trim();
  const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean.padEnd(6, "0").slice(0, 6);
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function splitLabel(label: string, maxChars: number) {
  const source = String(label || "").trim();
  if (!source) return [""];
  const lines: string[] = [];
  for (let index = 0; index < source.length; index += maxChars) {
    lines.push(source.slice(index, index + maxChars));
  }
  return lines.slice(0, 3);
}

function getDimensions(entry: GrowthHistoryEntry): GrowthDimensionValue[] {
  return growthDimensionMeta.map((item) => ({
    ...item,
    value: entry.dimensionScores[item.key],
  }));
}

function getRadarPoints(values: number[], cx: number, cy: number, radius: number) {
  const total = values.length;
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
    const ratio = clamp(Number(value) || 0, 0, 100) / 100;
    return {
      x: cx + Math.cos(angle) * radius * ratio,
      y: cy + Math.sin(angle) * radius * ratio,
    };
  });
}

function RadarSvg({
  history,
  selectedIndex,
  onSelect,
}: {
  history: GrowthHistoryEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const width = 720;
  const height = 420;
  const cx = width / 2;
  const cy = height * 0.56;
  const radius = 146;
  const gridRings = 5;
  const axisColor = "rgba(24, 35, 42, 0.12)";
  const gridColor = "rgba(24, 35, 42, 0.08)";
  const labelColor = "#607074";
  const selectedBase = growthPalette[0];
  const dimensions = history[0] ? getDimensions(history[0]) : [];

  const orderedIndexes = history
    .map((_, index) => index)
    .filter((index) => index !== selectedIndex)
    .concat(selectedIndex >= 0 ? [selectedIndex] : []);

  return (
    <svg aria-label="成长雷达图" className="proto-viz-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: gridRings }, (_, ringIndex) => {
        const ratio = (ringIndex + 1) / gridRings;
        const points = dimensions
          .map((_, dimIndex) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * dimIndex) / dimensions.length;
            return `${(cx + Math.cos(angle) * radius * ratio).toFixed(2)},${(cy + Math.sin(angle) * radius * ratio).toFixed(2)}`;
          })
          .join(" ");
        return (
          <polygon
            fill={ringIndex % 2 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}
            key={`ring_${ringIndex}`}
            points={points}
            stroke={gridColor}
            strokeWidth="1"
          />
        );
      })}

      {dimensions.map((dim, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / dimensions.length;
        const axisX = cx + Math.cos(angle) * radius;
        const axisY = cy + Math.sin(angle) * radius;
        const labelX = cx + Math.cos(angle) * (radius + 28);
        const labelY = cy + Math.sin(angle) * (radius + 26);
        const anchor = Math.abs(Math.cos(angle)) < 0.25 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        const lines = splitLabel(dim.label, 4);
        return (
          <g key={dim.key}>
            <line stroke={axisColor} strokeWidth="1" x1={cx} x2={axisX} y1={cy} y2={axisY} />
            <text
              dominantBaseline="middle"
              fill={labelColor}
              fontSize="12"
              fontWeight="700"
              textAnchor={anchor}
              x={labelX}
              y={labelY}
            >
              {lines.map((line, lineIndex) => (
                <tspan dy={lineIndex === 0 ? 0 : 14} key={`${dim.key}_${lineIndex}`} x={labelX}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {orderedIndexes.map((index) => {
        const entry = history[index];
        const points = getRadarPoints(
          getDimensions(entry).map((item) => item.value),
          cx,
          cy,
          radius,
        );
        const pointString = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
        const isSelected = index === selectedIndex;
        const opacityBase = isSelected ? 0.94 : Math.min(0.18 + ((index + 1) / history.length) * 0.18, 0.5);
        const fillOpacity = isSelected ? 0.18 : Math.min(0.04 + ((index + 1) / history.length) * 0.05, 0.12);

        return (
          <g
            className="proto-radar-series"
            key={entry.reviewId}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(index);
            }}
          >
            <polygon
              fill={hexToRgba(selectedBase, fillOpacity)}
              points={pointString}
              stroke={hexToRgba(selectedBase, opacityBase)}
              strokeLinejoin="round"
              strokeWidth={isSelected ? 2.8 : 1.35}
            />
            <polygon className="proto-radar-hit" fill="transparent" points={pointString} stroke="transparent" strokeWidth="22" />
            {isSelected
              ? points.map((point, pointIndex) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="#ffffff"
                    key={`${entry.reviewId}_${pointIndex}`}
                    r="4.5"
                    stroke={selectedBase}
                    strokeWidth="2"
                  />
                ))
              : null}
          </g>
        );
      })}
    </svg>
  );
}

function StackedSvg({
  history,
  selectedIndex,
  onSelect,
  showNumbers,
}: {
  history: GrowthHistoryEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  showNumbers: boolean;
}) {
  const width = 720;
  const height = 420;
  const margin = showNumbers ? { top: 22, right: 20, bottom: 102, left: 48 } : { top: 18, right: 18, bottom: 96, left: 22 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const totals = history.map((entry) => getDimensions(entry).reduce((sum, item) => sum + item.value, 0));
  const maxTotal = Math.max(...totals, 300);
  const cappedMax = Math.ceil(maxTotal / 20) * 20;
  const count = Math.max(history.length, 1);
  const step = plotWidth / count;
  const barWidth = clamp(step * 0.5, 30, 58);
  const gridLines = 5;

  return (
    <svg aria-label="成长堆叠柱状图" className="proto-viz-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: gridLines + 1 }, (_, index) => {
        const y = margin.top + (plotHeight / gridLines) * index;
        const value = Math.round(cappedMax - (cappedMax / gridLines) * index);
        return (
          <g key={`grid_${index}`}>
            <line
              stroke="rgba(24, 35, 42, 0.08)"
              strokeWidth="1"
              x1={margin.left}
              x2={width - margin.right}
              y1={y}
              y2={y}
            />
            {showNumbers ? (
              <text
                dominantBaseline="middle"
                fill="#607074"
                fontSize="10"
                fontWeight="700"
                textAnchor="end"
                x={margin.left - 8}
                y={y}
              >
                {value}
              </text>
            ) : null}
          </g>
        );
      })}

      <line
        stroke="rgba(24, 35, 42, 0.14)"
        strokeWidth="1.2"
        x1={margin.left}
        x2={width - margin.right}
        y1={height - margin.bottom}
        y2={height - margin.bottom}
      />

      {history.map((entry, index) => {
        const dimensions = getDimensions(entry);
        const xCenter = margin.left + step * index + step / 2;
        const x = xCenter - barWidth / 2;
        const isSelected = index === selectedIndex;
        const totalHeight = (totals[index] / cappedMax) * plotHeight;
        let cursorY = height - margin.bottom;

        return (
          <g
            key={entry.reviewId}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(index);
            }}
          >
            {isSelected ? (
              <rect
                fill="rgba(12, 106, 120, 0.06)"
                height={plotHeight + 18}
                rx="16"
                stroke="rgba(12, 106, 120, 0.12)"
                strokeWidth="1"
                width={step * 0.84}
                x={xCenter - step * 0.42}
                y={margin.top - 6}
              />
            ) : null}

            {dimensions.map((dim, dimIndex) => {
              const value = dim.value;
              const segmentHeight = Math.max(2, (value / cappedMax) * plotHeight);
              const y = cursorY - segmentHeight;
              cursorY = y;
              return (
                <rect
                  fill={hexToRgba(growthPalette[dimIndex] || growthPalette[0], isSelected ? 0.94 : 0.72)}
                  height={segmentHeight}
                  key={dim.key}
                  rx={dimIndex === dimensions.length - 1 ? 10 : 0}
                  stroke={isSelected ? "rgba(255, 255, 255, 0.7)" : "transparent"}
                  strokeWidth={isSelected ? 1 : 0}
                  width={barWidth}
                  x={x}
                  y={y}
                />
              );
            })}

            {isSelected ? (
              <>
                <rect
                  fill="transparent"
                  height={totalHeight + 4}
                  rx="12"
                  stroke="rgba(12, 106, 120, 0.28)"
                  strokeWidth="1.2"
                  width={barWidth + 4}
                  x={x - 2}
                  y={height - margin.bottom - totalHeight - 2}
                />
                {showNumbers ? (
                  <text
                    fill="#1e2b2f"
                    fontSize="11"
                    fontWeight="800"
                    textAnchor="middle"
                    x={xCenter}
                    y={height - margin.bottom - totalHeight - 12}
                  >
                    {totals[index]}
                  </text>
                ) : null}
              </>
            ) : null}

            <text
              dominantBaseline="hanging"
              fill={isSelected ? "#1e2b2f" : "#607074"}
              fontSize="11"
              fontWeight={isSelected ? "800" : "700"}
              textAnchor="middle"
              x={xCenter}
              y={height - margin.bottom + 24}
            >
              {splitLabel(entry.assignmentName, 6).map((line, lineIndex) => (
                <tspan dy={lineIndex === 0 ? 0 : 14} key={`${entry.reviewId}_${lineIndex}`} x={xCenter}>
                  {line}
                </tspan>
              ))}
            </text>

            <rect
              className="proto-bar-hit"
              fill="transparent"
              height={plotHeight + 72}
              rx="18"
              width={step * 0.92}
              x={xCenter - step * 0.46}
              y={margin.top - 8}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function GrowthVisualization({
  history,
  selectedIndex,
  onSelect,
  showNumbers = false,
  showLegendStack = false,
}: GrowthVisualizationProps) {
  const [flipped, setFlipped] = useState(false);
  const dimensions = useMemo(() => (history.length ? getDimensions(history[0]) : []), [history]);

  function toggleFlip(event?: MouseEvent) {
    event?.stopPropagation();
    setFlipped((value) => !value);
  }

  if (!history.length) {
    return <div className="proto-empty">当前暂无成长记录。</div>;
  }

  return (
    <div className={`proto-viz-layout ${showLegendStack ? "" : "solo"}`}>
      <div
        className={`proto-viz-card ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((value) => !value)}
        role="presentation"
      >
        <div className="proto-viz-card-inner">
          <div className="proto-viz-face front">
            <button className="proto-viz-toggle" onClick={toggleFlip} type="button">
              点击翻转
            </button>
            <div
              className="proto-chart-frame"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="proto-chart-interactive">
                <RadarSvg history={history} onSelect={onSelect} selectedIndex={selectedIndex} />
              </div>
            </div>
          </div>

          <div className="proto-viz-face back">
            <button className="proto-viz-toggle" onClick={toggleFlip} type="button">
              点击翻转
            </button>
            <div className="proto-stack-legend">
              {dimensions.map((item, index) => (
                <span className="proto-stack-pill" key={item.key}>
                  <span className="proto-swatch" style={{ background: growthPalette[index] }} />
                  {item.label}
                </span>
              ))}
            </div>
            <div
              className="proto-chart-frame proto-chart-frame-back"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="proto-chart-interactive">
                <StackedSvg history={history} onSelect={onSelect} selectedIndex={selectedIndex} showNumbers={showNumbers} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLegendStack ? (
        <div className="proto-growth-legend-stack">
          {history.map((entry, index) => (
            <button
              className={`proto-growth-legend-card ${index === selectedIndex ? "selected" : ""}`}
              key={entry.reviewId}
              onClick={() => onSelect(index)}
              type="button"
            >
              <div className="proto-growth-legend-top">
                <div className="proto-growth-step-index">第 {index + 1} 次作业</div>
                <div className="proto-growth-step-date">{entry.reviewDate}</div>
              </div>
              <div className="proto-growth-legend-name">{entry.assignmentName}</div>
              <div className="proto-growth-legend-tag">{entry.tag || "该次作业暂无额外标签"}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
