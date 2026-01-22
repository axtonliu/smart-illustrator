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
