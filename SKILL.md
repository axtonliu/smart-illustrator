---
name: smart-illustrator
description: 智能文章配图策划师。分析文章内容，识别最佳配图位置，根据内容类型选择合适的配图形式（概念图、流程图、对比图、数据图、场景图、要点图），输出可直接用于 Gemini 等 AI 绘图工具的批量 prompt。使用 Axton 签名视觉风格。触发词：配图、插图、illustrate、为文章画图、生成配图。
---

# Smart Illustrator - 智能文章配图策划师

将文章内容转化为可直接用于 AI 绘图的配图方案。

## 使用方式

```bash
# 分析文章并生成配图方案（含封面图）
/smart-illustrator path/to/article.md

# 指定风格模式
/smart-illustrator path/to/article.md --mode light   # 浅色清爽（默认）
/smart-illustrator path/to/article.md --mode dark    # 深色科技

# 不生成封面图
/smart-illustrator path/to/article.md --no-cover

# 指定配图数量
/smart-illustrator path/to/article.md --count 5

# 直接输入内容
/smart-illustrator
[粘贴文章内容]
```

## 核心能力

### 1. 智能位置识别

分析文章结构，识别最需要配图的位置：

| 信号 | 配图价值 |
|------|---------|
| 抽象概念首次出现 | 高 - 帮助读者建立心智模型 |
| 流程/步骤描述 | 高 - 可视化比文字更清晰 |
| 对比/选择论述 | 高 - 左右对比一目了然 |
| 数据/统计引用 | 中 - 数字图形化更有冲击力 |
| 章节转折点 | 中 - 提供视觉喘息 |
| 情感/故事高潮 | 中 - 增强共鸣 |

### 2. 双引擎系统（核心创新）

根据配图内容自动选择最佳渲染引擎：

```
文章内容分析
     │
     ▼
┌─────────────────────────────────────┐
│        判断配图类型                   │
└─────────────────────────────────────┘
     │                    │
     ▼                    ▼
┌──────────────┐    ┌──────────────┐
│   Mermaid    │    │    Gemini    │
│  结构化图形   │    │  创意/视觉图  │
└──────────────┘    └──────────────┘
     │                    │
     ▼                    ▼
   mmdc 导出 PNG       API 生成 PNG
     │                    │
     └────────┬───────────┘
              ▼
        插入文章
```

#### Mermaid 引擎（结构化图形）

适合有明确逻辑结构的内容，输出专业、精确、可编辑：

| 图形类型 | Mermaid 语法 | 适用场景 |
|---------|-------------|---------|
| 流程图 | `flowchart` | 步骤、流程、决策分支 |
| 时序图 | `sequenceDiagram` | 交互流程、API 调用 |
| 架构图 | `block-beta` | 系统组件、层次结构 |
| 思维导图 | `mindmap` | 发散结构、知识整理 |
| 状态图 | `stateDiagram` | 状态转换、生命周期 |
| 时间线 | `timeline` | 线性事件、历史演进 |
| ER 图 | `erDiagram` | 数据关系、实体模型 |
| 类图 | `classDiagram` | 代码结构、继承关系 |
| 饼图 | `pie` | 比例分布、占比统计 |

**触发关键词**：流程、步骤、阶段、节点、架构、组件、模块、系统、交互、调用、状态、转换、层级、结构、关系、依赖

#### Gemini 引擎（创意/视觉图形）

适合需要视觉表达、氛围渲染、创意隐喻的内容：

| 图形类型 | 代号 | 适用场景 |
|---------|------|---------|
| 隐喻图 | `metaphor` | 类比、比喻、象征表达 |
| 场景图 | `scene` | 故事、情境、叙事画面 |
| 信息图 | `infographic` | 数据可视化 + 设计感 |
| 概念图 | `concept` | 抽象概念的视觉化（非结构化） |
| 封面图 | `cover` | 品牌风格、视觉吸引 |

**触发关键词**：像...一样、比喻、类比、场景、情境、故事、画面、氛围、封面

#### 引擎选择决策树

```
内容分析
    │
    ├─ 有明确的逻辑结构？（节点、箭头、层级）
    │   └─ Yes → Mermaid
    │
    ├─ 需要视觉隐喻/创意表达？
    │   └─ Yes → Gemini
    │
    ├─ 是技术文档？（API、架构、流程）
    │   └─ Yes → Mermaid
    │
    ├─ 需要氛围/情感表达？
    │   └─ Yes → Gemini
    │
    └─ 默认 → Gemini
```

### 3. 风格与类型

**风格 (Style)** 和 **类型 (Type)** 是两个独立维度：

| 维度 | 说明 | 决定方式 |
|------|------|---------|
| **风格** | 视觉外观：颜色、调性、氛围 | 调用时指定，**整篇文章统一** |
| **类型** | 信息结构：如何组织内容 | 根据内容自动选择，每张图可不同 |
| **引擎** | 渲染方式：Mermaid 或 Gemini | 根据类型自动选择 |

#### 风格：2 种（调用时指定）

| 风格 | 参数 | 适用场景 |
|------|------|---------|
| 浅色清爽 | `--mode light`（默认） | 文章配图、概念解释、日常内容 |
| 深色科技 | `--mode dark` | 课程宣传、产品介绍、高冲击力场景 |

#### 类型与引擎对照表

| 类型 | 代号 | 引擎 | 适用场景 | 构图特征 |
|------|------|------|---------|---------|
| 流程图 | `process` | **Mermaid** | 步骤、流程、因果链 | flowchart 语法 |
| 架构图 | `architecture` | **Mermaid** | 系统组件、层次结构 | block-beta 语法 |
| 时序图 | `sequence` | **Mermaid** | 交互流程、调用链 | sequenceDiagram 语法 |
| 思维导图 | `mindmap` | **Mermaid** | 发散结构、知识整理 | mindmap 语法 |
| 状态图 | `state` | **Mermaid** | 状态转换、生命周期 | stateDiagram 语法 |
| 概念图 | `concept` | **Gemini** | 抽象概念、思想、定义 | 中心辐射、隐喻画面 |
| 对比图 | `comparison` | **Gemini** | A vs B、优劣、变化 | 左右/上下分栏 |
| 数据图 | `data` | **Gemini** | 数字、统计、趋势 | 信息图风格 |
| 场景图 | `scene` | **Gemini** | 故事、情境、氛围 | 叙事性插画 |
| 隐喻图 | `metaphor` | **Gemini** | 类比、比喻、象征 | 创意视觉类比 |
| 封面图 | `cover` | **Gemini** | 文章封面 | 16:9 深色科技风格 |

**关键原则**：同一篇文章的所有配图使用**统一风格**，但可以有**不同类型**。

例如：一篇文章生成 3 张配图（风格：浅色清爽）
- 图 1：concept（概念图）→ 浅色清爽
- 图 2：process（流程图）→ 浅色清爽
- 图 3：comparison（对比图）→ 浅色清爽

**视觉风格统一，信息结构多样**。

## 视觉风格系统

风格定义已模块化，便于替换为你自己的品牌：

```
references/
├── brand-colors.md    # 品牌色板（可自定义）
├── style-light.md     # 浅色清爽风格 Gemini Prompt
└── style-dark.md      # 深色科技风格 Gemini Prompt
```

### 两种风格模式

| 模式 | 文件 | 适用场景 |
|------|------|----------|
| 浅色清爽 | `style-light.md` | 正文配图（默认） |
| 深色科技 | `style-dark.md` | 封面图 |

### 自定义品牌风格

1. 修改 `references/brand-colors.md` 中的颜色值
2. 同步更新 `style-light.md` 和 `style-dark.md` 中的 Prompt
3. 完成！你的 Skill 就有了自己的品牌风格

## 工作流程（自动执行）

**重要**：以下所有步骤由 Claude 自动完成，用户无需手动执行任何命令。

### Step 1: 分析文章

1. 读取文章内容
2. 识别文章结构（章节、段落、要点）
3. 标记潜在配图位置（通常 3-5 个）
4. 为每个位置确定：
   - 配图类型（process/architecture/sequence/concept/comparison 等）
   - 渲染引擎（Mermaid 或 Gemini）

### Step 2: 生成图片（自动执行）

根据引擎类型，**直接调用命令**生成图片：

#### Mermaid 类型（结构化图形）

1. 生成 Mermaid 代码，保存为临时 `.mmd` 文件
2. **直接调用 Bash 执行**：
```bash
mmdc -i {文章目录}/{文章名}-diagram-01.mmd -o {文章目录}/{文章名}-image-01.png -t neutral -b white
```
3. 删除临时 `.mmd` 文件（可选保留）

#### Gemini 类型（创意/视觉图形）

1. 根据 `references/style-light.md` 生成 prompt
2. **直接调用 Bash 执行**：
```bash
GEMINI_API_KEY=$GEMINI_API_KEY npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts \
  --prompt "生成的 prompt 内容" \
  --output {文章目录}/{文章名}-image-02.png
```

#### 封面图（Gemini，深色风格）

1. 根据 `references/style-dark.md` 生成封面 prompt
2. **直接调用 Bash 执行**：
```bash
GEMINI_API_KEY=$GEMINI_API_KEY npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts \
  --prompt "封面 prompt 内容" \
  --output {文章目录}/{文章名}-cover.png
```

### Step 3: 创建带配图的文章

1. 复制原文内容
2. 在 YAML frontmatter 中添加封面图引用
3. 在各配图位置插入图片 Markdown 引用
4. 保存为 `{文章名}-image.md`

### Step 4: 输出确认

完成后向用户报告：
- 生成了几张图片（哪些用 Mermaid，哪些用 Gemini）
- 输出文件列表
- 任何错误或警告

**输出文件清单**：
```
article.md                    # 原文（不修改）
article-image.md              # 带配图的文章（核心输出）
article-cover.png             # 封面图（Gemini，16:9）
article-image-01.png          # 配图 1（可能是 Mermaid 或 Gemini）
article-image-02.png          # 配图 2
article-image-03.png          # 配图 3
```

**命名约定**：
- 封面图：`{文章名}-cover.png`
- 正文配图：`{文章名}-image-01.png`（序号递增）
- 临时 Mermaid 文件：`{文章名}-diagram-01.mmd`（可选保留）

---

### 封面图设计

封面图使用深色科技风格，详见 `references/style-dark.md`。

| 维度 | 封面图 | 正文配图 |
|------|--------|----------|
| 风格文件 | `style-dark.md` | `style-light.md` |
| 比例 | 16:9 横版 | 3:4 竖版 |
| 文字 | **无** | 标签、说明 |
| 目的 | 吸引点击 | 解释内容 |

**封面图设计原则**：
1. 从文章标题提取核心概念
2. 用视觉隐喻表达（如：A → B 的转化）
3. 不带文字（标题由发布平台显示）

完整 Prompt 模板见 `references/style-dark.md`。

---

### 核心输出：`{文章名}-image.md`

带配图引用的完整文章，包含：

1. **YAML frontmatter** 声明封面图：
```yaml
---
image: article-cover.png
---
```

2. **正文配图**在适当位置插入：
```markdown
![图片描述](article-image-01.png)
```

图片插入位置应紧跟相关内容段落之后。

## 输出示例

### 带配图的文章（article-image.md）

```markdown
---
image: ai-agent-cover.png
---

# AI Agent 入门指南

## 什么是 AI Agent

AI Agent 是能够感知环境、做出决策、采取行动的智能系统...

![AI Agent 四大能力](ai-agent-image-01.png)

## Agent vs Chatbot

传统 Chatbot 只能被动响应，而 Agent 可以主动规划...

![Agent vs Chatbot 对比](ai-agent-image-02.png)

...
```

**输出文件清单**：
```
ai-agent.md                   # 原文
ai-agent-image.md             # 带配图的文章
ai-agent-cover.png            # 封面图（16:9）
ai-agent-image-01.png         # 正文配图（3:4）
ai-agent-image-02.png
ai-agent-image-03.png
```

## 配图数量建议

| 文章类型 | 建议配图数 |
|---------|-----------|
| 短文 (< 1000 字) | 1-2 张 |
| 中篇 (1000-3000 字) | 2-4 张 |
| 长文 (> 3000 字) | 4-6 张 |
| 教程/指南 | 每个主要步骤 1 张 |

## 配图类型 × 构图对照表

| 类型 | 推荐构图 | 示例 |
|------|---------|------|
| concept | 中心辐射、层级结构 | 核心概念 + 周围要素 |
| process | 横向流程、纵向时间线 | 节点 + 箭头连接 |
| comparison | 左右对比、上下对比 | 两栏 + 对应项 |
| data | 柱状、饼图、趋势线 | 数字突出 + 图形化 |
| scene | 场景插画、故事画面 | 人物 + 环境 + 动作 |
| summary | 卡片网格、要点列表 | 结构化布局 |
| metaphor | 类比画面、象征图形 | 创意视觉隐喻 |

## 注意事项

1. **不编造内容**：所有配图内容必须来自原文
2. **一图一点**：每张图只传达 1 个核心信息
3. **位置合理**：配图位置应在相关内容之后
4. **风格一致**：同一篇文章的配图保持视觉统一
5. **文字精简**：图上文字控制在 20 字以内

## 前置要求（用户需确保）

在使用此 Skill 前，用户需确保以下工具已安装：

### 1. Mermaid CLI（用于结构化图形）

```bash
npm install -g @mermaid-js/mermaid-cli
```

验证安装：`mmdc --version`

### 2. Gemini API Key（用于创意/视觉图形）

1. 获取 API Key: https://aistudio.google.com/apikey
2. 设置环境变量: `export GEMINI_API_KEY=your_key`

### 3. Bun 运行时（用于脚本执行）

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## 引擎配置参考

Claude 在自动执行时会使用以下配置：

### Mermaid 主题

| 风格 | 主题参数 | 背景 |
|------|---------|------|
| 浅色清爽 | `-t neutral` | `-b white` |
| 深色科技 | `-t dark` | `-b transparent` |

### Gemini 模型

**模型**：`gemini-3-pro-image-preview`（2K 质量，$0.134/张 ≈ ¥1/张）

---

## 执行示例

用户只需输入：

```
/smart-illustrator path/to/article.md
```

Claude 会自动完成所有工作：
1. 分析文章内容，识别配图位置
2. 为每个位置选择最佳引擎（Mermaid 或 Gemini）
3. 自动生成图片并保存到文章目录
4. 创建带配图的 `article-image.md`

**用户无需手动执行任何命令。**

---

## 成本估算（Gemini API）

| 用量 | 价格 | 人民币 |
|------|------|--------|
| 1 张 | $0.134 | ¥0.97 |
| 10 张 | $1.34 | ¥9.7 |
| 100 张 | $13.4 | ¥97 |
| 1000 张 | $134 | ¥970 |
