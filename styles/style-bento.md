# Style: Bento Grid / 功能展示网格

Apple 风格 Bento Grid 布局，用于产品功能展示、开源项目 README 配图、Landing Page hero image 等。

> **设计哲学**：像 Apple 发布会上的功能总览页——每个格子是一个独立的功能卖点，大小不一的网格自然引导视觉优先级。

## 适用场景

- 开源项目 README 功能展示
- 产品 Landing Page hero image
- 推文/社交媒体功能宣传图
- App Store / Product Hunt 展示图
- 演示文稿功能总览页

## 配色方案

Bento Grid 使用 **单强调色 + 深底色** 方案，与封面图的双色光线系统不同——因为网格信息密度高，双色会造成视觉混乱。

### 默认配色：Deep Navy + Warm Orange

| 元素 | 颜色 | Hex | 说明 |
|------|------|-----|------|
| 背景 | Deep Navy | `#1a1a2e` | 带蓝紫色调的深色，比纯黑更有温度和层次 |
| 卡片背景 | 略浅于背景 | `#252547` | 通过微妙明度差区分卡片与底色 |
| 强调色 | Warm Orange | `#ff6b35` | 图标、高亮元素、交互暗示 |
| 主文字 | 纯白 | `#ffffff` | 英文标题、中文短描述 |
| 次文字 | 浅灰 | `#a0a0b8` | 辅助说明文字 |

### 配色选择逻辑

- `#1a1a2e` 而非 `#0A0A0A`：纯黑适合封面图的戏剧感，但 Bento Grid 需要"温暖的技术感"——deep navy 的蓝紫底色让卡片有空间层次
- `#ff6b35` 而非 `#F59E0B`：琥珀橙太柔和，在小图标上缺乏冲击力；warm orange 更红更饱和，在深蓝底上对比度极高但不刺眼
- 单色而非双色：每个格子都有图标+文字，信息密度已经很高，单一强调色保持视觉统一

### 备选配色

可根据产品调性替换强调色，保持 deep navy 背景不变：

| 调性 | 强调色 | Hex | 适合 |
|------|--------|-----|------|
| 活力/创意 | Warm Orange | `#ff6b35` | 开发者工具、创作者产品 |
| 专业/可靠 | Electric Blue | `#4a9eff` | 企业工具、基础设施 |
| 增长/健康 | Emerald Green | `#34d399` | 效率工具、环保/健康产品 |
| 高端/品牌 | Soft Purple | `#a78bfa` | 设计工具、品牌产品 |

---

## Gemini System Prompt

```
Create a Bento Grid style feature showcase image.

**Format**: 16:9 landscape

---

## Visual Style

Apple-inspired Bento Grid layout:
- Rounded rectangles of varying sizes arranged in a grid
- Dark background (#1a1a2e deep navy)
- Clean, modern, minimal
- Each cell has a simple icon/illustration + short text label
- Subtle gradients within cards (very subtle, from card background to slightly lighter)
- Soft shadows between cards for depth
- Color accent: warm orange (#ff6b35) for icons and highlights

---

## Grid Structure

4 columns × 3 rows layout with varying cell sizes:
- [2×1 LARGE] cells: Hero features, most important selling points
- [1×1] cells: Standard features
- [2×1 WIDE] cells: Features that need more horizontal text space

Size variation creates natural visual hierarchy — larger cells draw attention first.

---

## Icon Style

- Simple line-art icons, NOT filled/solid icons
- Stroke width: consistent thin lines
- Icon color: warm orange (#ff6b35) as primary, white as secondary
- Icons should be abstract/symbolic, not literal screenshots
- Each icon should be immediately recognizable at small size

---

## Typography

- Product name at top center: clean sans-serif, bold weight, white
- Subtitle below product name: lighter weight, slightly smaller, light gray (#a0a0b8)
- Cell titles: white, medium weight, English preferred
- Cell descriptions: light gray (#a0a0b8), smaller, can mix Chinese + English
- All text must be crisp and readable — no decorative fonts

---

## Rules

- No device mockups (no laptop/phone frames)
- Pure iconographic — icons + text only
- No photographs or realistic illustrations
- No gradients on background (flat deep navy)
- Cards may have very subtle inner shadow or glass-morphism effect
- Maintain consistent padding/margins between all cells
- Overall feel: premium, restrained, Apple-like
```

## Prompt 模板

生成 Bento Grid 时，将此模板与产品信息结合：

```
[Insert System Prompt above]

**Product**: [产品名]
**Tagline**: [一句话描述，英文]

**Grid layout** (4 columns × 3 rows):

Row 1:
- [size] "Cell Title" — icon description, text: "显示文字"
- ...

Row 2:
- ...

Row 3:
- ...

**Color accent**: [选择强调色，默认 warm orange #ff6b35]

Title at top center: "[产品名]" in clean sans-serif bold
Subtitle below: "[tagline]"

No device mockups. Pure iconographic Bento Grid. Icons should be simple line-art style with the accent color.
```

---

## Grid 布局设计指南

### 格子分配原则

| 格子大小 | 数量 | 用途 |
|---------|------|------|
| [2×1 LARGE] | 2-3 个 | 核心差异化功能（最想让用户记住的） |
| [1×1] | 4-6 个 | 标准功能点 |
| [2×1 WIDE] | 0-1 个 | 需要长文字说明的功能 |

### 内容编排建议

1. **痛点驱动**：格子标题不是功能名，而是用户痛点的解决方案（"Never Lose Audio" > "Audio Recovery"）
2. **中英混合**：英文标题 + 中文短描述，兼顾国际化和本地理解
3. **数量控制**：9-12 个格子，不超过 12 个（信息过载）
4. **视觉节奏**：大格子不要相邻，交替排列制造节奏感

### 从功能列表到 Grid 的转化步骤

1. 列出所有功能点（通常 15-20 个）
2. 按"用户感知价值"排序
3. Top 2-3 → [2×1 LARGE]
4. 中间 4-6 → [1×1]
5. 需要解释的 → [2×1 WIDE]
6. 剩余的合并或舍弃
7. 排列时让大格子分散在不同行

---

## 水印策略

**Bento Grid 不加水印**：
- 功能展示图通常用于 README / Landing Page，水印破坏专业感
- 产品名本身已在图中，起到品牌标识作用

---

## 使用示例

### 示例：VerbatimFlow macOS 语音输入工具

**中文设计思路**：
- 核心卖点：忠实转写（不改原话）、热键稳定、录音不丢
- 差异化：两种模式（Standard / Clarify）、多引擎、开源
- 受众：开发者 + 效率用户，中英混合文案

**Prompt**：

```
Create a Bento Grid style feature showcase image for "VerbatimFlow" — a macOS dictation app.

Style: Apple-inspired Bento Grid layout with rounded rectangles of varying sizes arranged in a grid. Dark background (#1a1a2e deep navy). Clean, modern, minimal. Each cell has a simple icon/illustration + short text. Use subtle gradients and soft shadows. Color accent: warm orange (#ff6b35) for highlights. Aspect ratio 16:9.

Grid layout (4 columns × 3 rows, cells vary in size):

Row 1:
- [2×1 LARGE] "Your Words, Not AI's" — crossed-out AI sparkle icon, text: "说什么打什么 · Never Rewrites"
- [1×1] "Two Modes" — two toggles (one on, one off), text: "Standard · Clarify"
- [1×1] "Open Source" — code brackets icon </>, text: "MIT · 代码透明"

Row 2:
- [1×1] "Push-to-Talk" — waveform + microphone icon, text: "按住录音 松开上屏"
- [1×1] "Rock-Solid Hotkey" — key icon with checkmark, text: "松手就停 · No Stuck Keys"
- [2×1 LARGE] "Never Lose Audio" — shield + retry icon, text: "转写失败？一键重试，录音不丢"

Row 3:
- [1×1] "Multi-Engine" — three engine logos stacked (Apple, Whisper wave, OpenAI), text: "Apple · Whisper · OpenAI"
- [2×1 WIDE] "Just an Input Method" — text input cursor blinking in a text field, text: "纯输入法 · Never Answers Back"
- [1×1] "Privacy You Control" — eye-slash icon, text: "你的音频 你做主"

Title at top center: "VerbatimFlow" in clean sans-serif bold
Subtitle below: "Your words, exactly as spoken."

No device mockups. Pure iconographic Bento Grid. Icons should be simple line-art style with the orange accent color.
```
