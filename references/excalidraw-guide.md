# Excalidraw JSON 规范（Smart Illustrator 用）

生成 Excalidraw 图表时必须遵循此规范。

## JSON 顶层结构

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```

文件扩展名：`.excalidraw`

## 元素模板

每个元素必须包含以下字段（**禁止**添加 `frameId`、`index`、`versionNonce`、`rawText`）：

```json
{
  "id": "unique-id",
  "type": "rectangle",
  "x": 100, "y": 100,
  "width": 200, "height": 50,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "roundness": { "type": 3 },
  "seed": 123456789,
  "version": 1,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false
}
```

- `boundElements` 必须为 `null`（不是 `[]`）
- `updated` 必须为 `1`（不是时间戳）
- `strokeStyle`：`"solid"`（实线，默认）| `"dashed"`（虚线）| `"dotted"`（点线）。虚线适合表示可选路径、异步流、弱关联等

### Text 元素额外属性

```json
{
  "text": "显示文本",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": null,
  "originalText": "显示文本",
  "autoResize": true,
  "lineHeight": 1.25
}
```

### Arrow 元素

箭头需要额外的 `points` 数组和端点绑定：

```json
{
  "type": "arrow",
  "points": [[0, 0], [200, 0]],
  "startBinding": null,
  "endBinding": null,
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

## 设计规则

### 文字
- **所有文本必须使用** `fontFamily: 5`（Excalifont 手写字体）
- 双引号 `"` → `『』`，圆括号 `()` → `「」`
- 字号下限：标题 20-28px，副标题 18-20px，正文 16-18px，注释 14px，**绝对禁止 < 14px**
- `lineHeight: 1.25`
- **禁止 Emoji**

### 文字居中估算

独立 text 元素的 `x` 是左边缘，需手动计算：
- 英文：`estimatedWidth = text.length * fontSize * 0.5`
- 中文：`estimatedWidth = text.length * fontSize * 1.0`
- 居中：`x = centerX - estimatedWidth / 2`

### 布局
- 画布范围：0-1200 x 0-800
- 最小形状尺寸：带文字的矩形/椭圆 ≥ 120x60px
- 元素间距：≥ 20-30px
- 四周留白：50-80px padding

## 色板

### 文字颜色（strokeColor）

| 用途 | 色值 |
|------|------|
| 标题 | `#1e40af` |
| 副标题/连接线 | `#3b82f6` |
| 正文 | `#374151` |
| 强调 | `#f59e0b` |

### 形状填充色（backgroundColor, fillStyle: "solid"）

| 色值 | 语义 |
|------|------|
| `#a5d8ff` | 输入、数据源、主要节点 |
| `#b2f2bb` | 成功、输出、已完成 |
| `#ffd8a8` | 警告、待处理、外部依赖 |
| `#d0bfff` | 处理中、中间件、特殊项 |
| `#ffc9c9` | 错误、关键、告警 |
| `#fff3bf` | 备注、决策、规划 |
| `#c3fae8` | 存储、数据、缓存 |
| `#eebefa` | 分析、指标、统计 |

### 区域背景色（大矩形 + opacity: 30）

| 色值 | 语义 |
|------|------|
| `#dbe4ff` | 前端/UI 层 |
| `#e5dbff` | 逻辑/处理层 |
| `#d3f9d8` | 数据/工具层 |

### 对比度规则
- 白底文字最浅不低于 `#757575`
- 浅色填充上用深色变体文字（如浅绿底用 `#15803d`）
- 避免浅灰文字（`#b0b0b0`、`#999`）出现在白底上

## Common Mistakes to Avoid

- **文字偏移** — text 的 `x` 是左边缘不是中心，必须用居中公式
- **元素重叠** — 放置前检查与周围元素 ≥ 20px 间距
- **画布留白不足** — 四周留 50-80px padding
- **标题没有居中** — 标题应居中于下方图表整体宽度
- **箭头标签溢出** — 长文字标签超出短箭头，保持标签简短或加大箭头
- **对比度不够** — 文字色不低于 `#757575`
- **字号太小** — 正文最小 16px，绝对禁止 < 14px
