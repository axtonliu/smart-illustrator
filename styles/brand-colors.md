# Brand Colors / 品牌色板

Axton 签名视觉风格色板。可替换为你自己的品牌色。

> **架构说明**：色板（Palette）和构图（Composition）是两个独立维度。色板定义在本文件中，构图定义在 `style-*.md` 中。每个 style 文件有默认色板，但色板可以跨构图复用。

---

## Palettes / 预设色板

每个色板是一组完整配色方案，可被任何 `style-*.md` 引用。

### Brand Signature / 品牌签名

封面图、品牌强绑定场景的默认色板。双色光线系统，戏剧化。

| 元素 | 颜色 | Hex | 说明 |
|------|------|-----|------|
| 背景 | Pure Black | `#0A0A0A` | 无尽虚空，最高对比度 |
| 主光/强调 | Amber Gold | `#F59E0B` | 侧光照亮主体，~70% |
| 辅光/点缀 | Sky Blue | `#38BDF8` | 边缘轮廓光，~30% |
| 主文字 | Pure White | `#FFFFFF` | — |
| 次文字 | Light Slate | `#94A3B8` | — |

**使用方式**：颜色通过**光线和折射**体现，不是涂在物体表面。
**默认用于**：`style-cover.md`、`style-dark.md`

### High Contrast / 高对比展示

功能展示、深色信息图、landing page 截图的色板。单强调色，信息密度高时保持视觉统一。

| 元素 | 颜色 | Hex | 说明 |
|------|------|-----|------|
| 背景 | Deep Navy | `#1a1a2e` | 带蓝紫色调，比纯黑更有温度和层次 |
| 卡片/表面 | Navy Surface | `#252547` | 微妙明度差区分层级 |
| 强调色 | Warm Orange | `#ff6b35` | 图标、高亮、交互暗示 |
| 主文字 | Pure White | `#ffffff` | — |
| 次文字 | Muted Lavender | `#a0a0b8` | — |

**配色逻辑**：
- `#1a1a2e` 而非 `#0A0A0A`：纯黑适合封面的戏剧感，但展示图需要"温暖的技术感"——deep navy 让卡片有空间层次
- `#ff6b35` 而非 `#F59E0B`：琥珀橙在小图标上太柔和；warm orange 更红更饱和，在深蓝底上对比度高但不刺眼
- 单色而非双色：信息密度高时，单一强调色保持统一

**备选强调色**（保持 deep navy 背景不变）：

| 调性 | 强调色 | Hex | 适合 |
|------|--------|-----|------|
| 活力/创意 | Warm Orange | `#ff6b35` | 开发者工具、创作者产品 |
| 专业/可靠 | Electric Blue | `#4a9eff` | 企业工具、基础设施 |
| 增长/健康 | Emerald Green | `#34d399` | 效率工具、环保/健康产品 |
| 高端/品牌 | Soft Purple | `#a78bfa` | 设计工具、品牌产品 |

**默认用于**：`style-bento.md`

### Light Neutral / 浅色中性

正文配图、教程说明的色板。干净专业，不抢文章内容的注意力。

| 元素 | 颜色 | Hex | 说明 |
|------|------|-----|------|
| 背景 | Light Gray | `#F8F9FA` | — |
| 卡片/表面 | Pure White | `#FFFFFF` | — |
| 强调色 | 继承品牌点缀色 | — | 用 Amber `#F59E0B` 或 Sky Blue `#38BDF8` |
| 主文字 | Slate Gray | `#64748B` | — |
| 次文字 | Light Slate | `#94A3B8` | — |

**默认用于**：`style-light.md`

### Minimal Slate / 极简石板

技术文档、白皮书的色板。最少颜色，最大留白。

| 元素 | 颜色 | Hex | 说明 |
|------|------|-----|------|
| 背景 | Pure White | `#FFFFFF` | — |
| 主色 | Deep Slate | `#1E293B` | — |
| 次色 | Medium Slate | `#475569` | — |
| 强调色 | 按内容选一个 | — | Technical `#3B82F6` / Creative `#F97316` / Growth `#10B981` |

**默认用于**：`style-minimal.md`

---

## Individual Colors / 单色参考

以下为所有色值的速查表，供 style 文件和 prompt 引用。

### Core / 核心色

| Color | Hex | Name | 用途 |
|-------|-----|------|------|
| Deep Space Violet | `#2F2B42` | 深空紫 | 主品牌色、标题 |

### Accent / 点缀色

| Color | Hex | Name | 用途 |
|-------|-----|------|------|
| Amber | `#F59E0B` | 琥珀橙 | 高亮、重点、CTA |
| Sky Blue | `#38BDF8` | 天空蓝 | 辅助点缀 |
| Vibrant Orange | `#FF5722` | 活力橙 | 仅用于 CTA 按钮 |
| Warm Orange | `#ff6b35` | 暖橙 | High Contrast 色板强调色 |

### Neutral / 中性色

| Color | Hex | Name | 用途 |
|-------|-----|------|------|
| Dark Slate | `#2d3748` | 暗板岩 | 深色模式卡片 |
| Slate Gray | `#64748B` | 石板灰 | 浅色模式正文 |
| Light Slate | `#94A3B8` | 浅石板 | 次要信息 |

### Background / 背景色

| Color | Hex | Name | 用途 |
|-------|-----|------|------|
| Pure Black | `#0A0A0A` | 纯黑 | 封面图首选 |
| Deep Navy | `#1a1a2e` | 深海蓝 | High Contrast 色板背景 |
| Deep Space Violet | `#2F2B42` | 深空紫 | 品牌色背景备选 |
| Light Gray | `#F8F9FA` | 浅灰白 | 浅色模式背景 |
| Pure White | `#FFFFFF` | 纯白 | 卡片背景 |

---

## 禁止使用

- 蓝紫渐变（`#667eea` → `#764ba2`）
- 彩虹渐变、紫粉渐变
- 高饱和霓虹色（如 `#4AFAFF`）
- 单边色条装饰

---

## Watermark / 水印配置

### 规则

| 图片类型 | 水印 | 原因 |
|---------|------|------|
| **封面图（Cover）** | ❌ 不加 | 封面图有频道/账号标识，水印影响点击率 |
| **正文配图** | ✅ 加 | 防止盗用，品牌曝光 |
| **PPT/Slides** | ✅ 加 | 标注来源 |
| **Bento Grid** | ❌ 不加 | 产品名本身已在图中，水印破坏专业感 |

### 水印格式

| 设置 | 值 |
|------|-----|
| 文字 | `© Axton \| axtonliu.ai` |
| 位置 | 左下角 |
| 浅色背景颜色 | 石板灰 `#64748B` |
| 深色背景颜色 | 白色 30% 透明度 |

**自定义**：替换为你的名字和网址即可。

---

## 自定义指南

如果你想替换为自己的品牌，请修改：

1. 预设色板：调整 Palettes 区的颜色值
2. 单色参考：同步更新速查表
3. 水印：替换为你的名字和网址（或删除）
4. 各 `style-*.md` 中的 System Prompt 会引用本文件的色板
