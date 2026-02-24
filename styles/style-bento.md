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

> **默认色板**：`brand-colors.md` → **High Contrast / 高对比展示**
>
> 色板定义、配色逻辑、备选强调色均在 `brand-colors.md` 中维护。本文件只定义构图和视觉语言，不重复定义颜色。

Bento Grid 使用 **单强调色 + 深底色** 方案，与封面图的双色光线系统不同——因为网格信息密度高，双色会造成视觉混乱。

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

见 `brand-colors.md` → Watermark 配置。Bento Grid 不加水印。

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
