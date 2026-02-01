# Smart Illustrator 项目开发规则

## Style 文件同步规则（重要）

`styles/style-light.md` 和 `styles/style-dark.md` 必须保持同步。

### 相同部分（修改时必须同步更新）

以下章节在两个文件中必须完全一致：

1. **工作方式（先理解，再设计）** - 4 步设计决策流程
2. **构图与表达方式** - 阅读路径、留白、文字精简原则
3. **统一视觉语言** - 75% 规整 + 25% 手绘的比例规则
4. **手绘占比控制（硬约束）** - 数量/面积/功能三个约束
5. **规则与禁忌（强制）** - 文字精简、禁止霓虹色、禁止俗套科技符号等
6. **水印** - 位置和格式规则

### 允许不同的部分

1. **适用场景** - light 用于正文配图，dark 用于封面图
2. **格式** - light 是 3:4 竖版，dark 是 16:9 横版
3. **色彩规范** - 这是两个 style 的核心差异
4. **Prompt 模板** - 根据使用场景不同
5. **附加参考表格** - light 有配图类型表，dark 有视觉隐喻表

### 修改检查清单

修改任一 style 文件时：

- [ ] 如果修改的是「相同部分」，另一个文件是否同步更新？
- [ ] 修改是否只影响「允许不同的部分」？
- [ ] 核心规则（手绘约束、禁忌符号等）是否保持一致？

## JSON 格式规范

PPT/Slides 模式生成的 JSON 必须使用 `picture_1`、`picture_2`... 格式，不能使用 `slides` 数组 + `id`。

生成前必须读取 `references/slides-prompt-example.json` 作为格式参考。

## 双目录同步规则（强制）

本项目存在两个目录，**必须始终保持完全同步**：

| 目录 | 用途 |
|------|------|
| `/Users/axton/Documents/DailyWork🌴/Project Files/Code Projects/AxtonOpenSource/smart-illustrator/` | 代码项目（用于 Git 管理和开源） |
| `~/.claude/skills/smart-illustrator/` | Skills 目录（Claude Code 运行时读取） |

### 同步检查清单

每次修改文件后，必须执行以下检查：

- [ ] 修改的文件是否同步到另一个目录？
- [ ] 新增的文件是否复制到另一个目录？
- [ ] 删除的文件是否从另一个目录也删除？

### 快速验证命令

```bash
# 对比两个目录的文件列表
diff <(ls -R "/Users/axton/Documents/DailyWork🌴/Project Files/Code Projects/AxtonOpenSource/smart-illustrator/" | sort) <(ls -R ~/.claude/skills/smart-illustrator/ | sort)
```

### 例外文件

以下文件只存在于代码项目目录，不需要同步到 skills：
- `LICENSE` - 开源许可证
- `.git/` - Git 版本控制

---

## 关键决策记录

### 输出模式设计（2026-01-16 确定）

**决策**：`--prompt-only` 是全局参数，适用于所有模式（article、slides、cover）。

| 模式 | 默认行为 | `--prompt-only` |
|------|---------|-----------------|
| article | 调用 API 生成图片 | 输出 prompt |
| slides | 调用 API 生成批量图片 | 输出 JSON prompt |
| cover | 调用 API 生成封面图 | 输出 prompt |

**原因**：可插拔设计，用户可选择手动复制 prompt 到 Gemini Web 生成。

### Mermaid 输出方式（2026-01-16 确定）

**决策**：Mermaid 图表默认嵌入代码块，不生成 PNG。

**备用方案**：`mermaid-export.ts` 脚本可导出 PNG（适用于微信公众号等不支持 Mermaid 渲染的平台）。

**原因**：代码块可编辑、零管理、版本控制友好。

### 风格触发词规避（2026-01-31 确定）

**决策**：禁止使用以下触发词：
- "科技风格"、"深色科技" → 触发蓝紫霓虹
- "设计师" → 触发输出 JSON 规范而非图片
- "信息图设计师" → 同上

**替代**：
- "深色高对比" 替代 "深色科技"
- "绘图师"、"绘制者" 替代 "设计师"

### SKILL.md 精简原则（2026-01-31 确定）

**决策**：SKILL.md 只包含执行指令，目标 < 300 行。

**移到 README 的内容**：成本估算、安装说明、能力解释、构图对照表。

**原因**：SKILL.md 是给 Claude 的指令，不是用户文档。太长会稀释关键规则。

### 宽高比控制（2026-01-31 确定）

**决策**：添加 `--aspect-ratio` 参数控制生成图片的宽高比。

**支持的比例**：`1:1`、`3:4`、`4:3`、`9:16`、`16:9`、`21:9` 等。

**默认行为**：
- 正文配图：3:4（竖版）
- 封面图：16:9（横版）

**原因**：之前封面图生成的是 2.625:1 而不是 16:9，因为没有传递 aspect ratio 参数。

### 引擎选择参数（2026-01-31 确定）

**决策**：添加 `--engine` 参数，允许用户指定 Mermaid 或 Gemini 引擎。

**选项**：
- `auto`（默认）：根据内容类型自动选择
- `mermaid`：强制只使用 Mermaid
- `gemini`：强制只使用 Gemini

**原因**：用户可能希望对技术文档统一使用 Mermaid，或对创意内容统一使用 Gemini。
