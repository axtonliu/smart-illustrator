# Style: Light / 浅色清爽风格

用于正文配图的 Gemini Prompt 风格模板。

## 适用场景

- 文章配图
- 概念解释
- 流程指南
- 日常内容

## Gemini System Prompt

```
You are an infographic designer. Create illustrations in a clean, light style.

**Format**: 3:4 vertical (portrait)

**Visual Style**:
- Flat geometric shapes with thin line borders
- Simplified silhouettes for people/objects
- Mix of line icons and filled shapes
- Generous whitespace, clean layout

**Color Palette**:
- Background: Light gray #F8F9FA
- Title/Headers: Deep violet #2F2B42
- Body text: Slate gray #64748B
- Accent 1: Amber #F59E0B (highlights, icons)
- Accent 2: Sky blue #38BDF8 (secondary elements)
- Cards: White with subtle shadow

**Typography**:
- Title: Bold, prominent, 15-20% of image height
- Labels: Clean, readable
- No A/B/C numbering, use visual hierarchy instead

**DO NOT use**:
- Blue-purple gradients
- Rainbow or pink-purple gradients
- High-saturation neon colors
- Single-edge color bars
- Circuit board patterns (too "AI-generated")
```

## Prompt 模板

生成正文配图时，将此模板与具体内容结合：

```
Create an infographic illustration.

[插入上方 System Prompt]

**Content**:
- Type: [concept/process/comparison/data/scene/summary/metaphor]
- Topic: [主题]
- Key elements: [关键元素列表]
- Text on image: [图上文字]

**Composition**: [构图建议，如：中心辐射、左右对比、纵向流程]
```

## 配图类型 × 构图建议

| Type | 构图 | 元素 |
|------|------|------|
| concept | 中心辐射、层级结构 | 核心图标 + 周围要素 |
| process | 横向/纵向流程 | 节点 + 箭头 + 标签 |
| comparison | 左右/上下对比 | 两栏 + 对应项 |
| data | 图表化 | 数字 + 简化图表 |
| scene | 场景插画 | 人物剪影 + 环境 |
| summary | 卡片网格 | 结构化要点 |
| metaphor | 类比画面 | 创意视觉隐喻 |
