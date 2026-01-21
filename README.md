# Smart Illustrator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Experimental](https://img.shields.io/badge/Status-Experimental-orange.svg)](#status)

Intelligent article illustration Skill for Claude Code with **dual-engine system**: automatically selects Mermaid (for structured diagrams) or Gemini (for creative visuals) based on content type.

## Status

> **Status: Experimental**
>
> - This is a public prototype that works for my demos, but does not yet cover all input scales and edge cases.
> - Output quality varies based on model version and input structure; results may fluctuate.
> - My primary focus is demonstrating how tools and systems work together, not maintaining this codebase.
> - If you encounter issues, please submit a reproducible case (input + output file + steps to reproduce).

## Features

- **Dual Engine System**: Auto-selects Mermaid or Gemini based on content type
- **Smart Position Detection**: Analyzes article structure to identify optimal illustration points
- **10+ Illustration Types**: flowchart, sequence, mindmap, concept, comparison, scene, metaphor...
- **Extensible Style System**: Light, Dark, Minimal, and custom styles
- **Cover Generation**: 16:9 landscape, no text, platform-ready
- **Brand Customizable**: Modify `styles/` to apply your brand style
- **Multiple Backends**: Mermaid CLI for diagrams, Gemini API for creative visuals

## What Are Skills?

Skills are prompt-based extensions for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that give Claude specialized capabilities. Unlike MCP servers that require complex setup, skills are simple markdown files that Claude loads on demand.

## Installation

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- [Bun](https://bun.sh/) runtime (for scripts)
- [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) (for diagram export): `npm install -g @mermaid-js/mermaid-cli`
- Gemini API Key (optional, for creative visuals): https://aistudio.google.com/apikey

### Option A: Manual Installation (Recommended)

```bash
# Clone to Claude Code Skills directory
git clone https://github.com/axtonliu/smart-illustrator.git ~/.claude/skills/smart-illustrator
```

### Option B: Copy Individual Files

```bash
# If you only want the skill without scripts
cp -r smart-illustrator/SKILL.md ~/.claude/skills/smart-illustrator/
cp -r smart-illustrator/styles ~/.claude/skills/smart-illustrator/
```

## Usage

### Basic Usage

```bash
# Analyze article and auto-generate illustrations (default)
/smart-illustrator path/to/article.md

# Output prompts only, don't auto-generate images
/smart-illustrator path/to/article.md --prompt-only

# Specify style (loads from styles/ directory)
/smart-illustrator path/to/article.md --style light     # Light style (default)
/smart-illustrator path/to/article.md --style dark      # Dark tech style
/smart-illustrator path/to/article.md --style minimal   # Minimal style

# List available styles
/smart-illustrator --list-styles

# Without cover image
/smart-illustrator path/to/article.md --no-cover

# Specify number of illustrations
/smart-illustrator path/to/article.md --count 5
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--prompt-only` | `false` | Output prompts only, don't call API to generate images |
| `--style` | `light` | Style name, loads `styles/style-{name}.md` |
| `--list-styles` | - | List all available styles in `styles/` directory |
| `--no-cover` | `false` | Skip cover image generation |
| `--count` | auto | Number of illustrations (auto-determined by article length) |

### Output Files

```
article.md                    # Original
article-image.md              # Article with illustrations (main output)
article-cover.png             # Cover image (16:9)
article-image-01.png          # Content illustration (3:4)
article-image-02.png
article-image-03.png
```

### Manual Gemini API Usage

```bash
# Set API Key
export GEMINI_API_KEY=your_key

# Single image
npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts \
  --prompt "A concept diagram showing..." \
  --output image.png

# Batch generation
npx -y bun ~/.claude/skills/smart-illustrator/scripts/batch-generate.ts \
  --config illustrations.json \
  --output-dir ./images
```

## PPT/Slides Generation Mode (Experimental)

Beyond article illustrations, this skill can generate batch infographics for PPT/Keynote slides. This mode outputs a JSON prompt file for manual Gemini generation.

### When to Use

| Mode | Use Case | Output |
|------|----------|--------|
| **Article Mode** | Blog posts, newsletters | 3-5 illustrations inserted in article |
| **Slides Mode** | Video B-roll, presentations | 8-15 standalone infographics |

### JSON Format for Batch Generation

The key to successful batch generation is using `picture_N` fields (not array with `id`):

```json
{
  "task": "请按以下指令为我生成 9 张独立的信息图。",
  "important": "不要合并在一起，每一张图片是一个单独的绘图任务。格式：16:9 横版。",
  "style": "[Complete style prompt - see styles/style-light.md]",
  "picture_1": {
    "topic": "厨房模型总览",
    "content": "[Raw content for this section]"
  },
  "picture_2": {
    "topic": "Skills vs MCP",
    "content": "[Raw content]"
  }
}
```

### Critical Rules

1. **Use `picture_N` fields** - Not an array with `id`. Gemini interprets `picture_1`, `picture_2` as separate tasks.

2. **Emphasize separation** - Must include: "不要合并在一起，每一张图片是一个单独的绘图任务"

3. **Pass complete style** - Include the full style prompt from `styles/style-light.md`, don't summarize.

4. **Content granularity** - Split by H2 headers, not every paragraph. ~9 images for a 12-minute video script.

5. **Don't specify composition** - Only provide `topic` (theme direction) + `content`. Let Gemini design the visual layout and choose the title text.

### Example Workflow

```bash
# 1. Claude analyzes article and generates JSON prompt
/smart-illustrator path/to/script.md --mode slides --output json

# 2. Copy JSON to Gemini (gemini.google.com or AI Studio)
# 3. Gemini generates images one by one
# 4. Download images manually
```

> **Note:** Currently `--mode slides` is not yet implemented. Use this format manually with Gemini.

See `references/slides-prompt-example.json` for a complete example.

---

## Dual Engine System

The skill automatically selects the best rendering engine based on content:

| Engine | Best For | Output |
|--------|----------|--------|
| **Mermaid** | Structured diagrams (flowcharts, sequences, architectures) | Professional, precise, editable |
| **Gemini** | Creative visuals (metaphors, scenes, infographics) | Artistic, atmospheric, branded |

## Illustration Types

| Type | Engine | Best For | Syntax/Style |
|------|--------|----------|--------------|
| `process` | Mermaid | Steps, workflows | `flowchart` |
| `architecture` | Mermaid | System components | `block-beta` |
| `sequence` | Mermaid | API calls, interactions | `sequenceDiagram` |
| `mindmap` | Mermaid | Knowledge structure | `mindmap` |
| `state` | Mermaid | State transitions | `stateDiagram` |
| `concept` | Gemini | Abstract concepts | Center-radial |
| `comparison` | Gemini | A vs B, contrasts | Left-right split |
| `data` | Gemini | Statistics, trends | Infographic style |
| `scene` | Gemini | Stories, scenarios | Narrative illustration |
| `metaphor` | Gemini | Analogies, symbols | Creative visual |
| `cover` | Gemini | Article cover | 16:9 dark tech |

## Style System

### Built-in Styles

| Style | File | Best For |
|-------|------|----------|
| Light | `styles/style-light.md` | Content illustrations (default) |
| Dark | `styles/style-dark.md` | Cover images, marketing |
| Minimal | `styles/style-minimal.md` | Technical docs, whitepapers |

### Content Illustrations: Light Style

- 3:4 portrait format
- Light gray background `#F8F9FA`
- Flat geometric + thin lines
- See `styles/style-light.md`

### Cover Images: Dark Tech Style

- 16:9 landscape format
- Deep blue gradient background
- Line icons + glassmorphism
- No text
- See `styles/style-dark.md`

### Custom Styles

Add your own style by creating `styles/style-{name}.md` and use it with `--style {name}`.

## File Structure

```
smart-illustrator/
├── SKILL.md                  # Skill definition (Claude Code entry)
├── README.md
├── LICENSE
├── scripts/
│   ├── generate-image.ts     # Gemini single image generation
│   ├── batch-generate.ts     # Gemini batch generation
│   └── mermaid-export.ts     # Mermaid diagram to PNG export
└── styles/
    ├── brand-colors.md       # Brand palette (customizable)
    ├── style-light.md        # Light style Gemini prompt (default)
    ├── style-dark.md         # Dark style Gemini prompt
    └── style-minimal.md      # Minimal style Gemini prompt
```

## Customization

Want to use your own brand style?

### Option 1: Modify Existing Styles

1. Edit `styles/brand-colors.md` with your colors
2. Sync color values in `styles/style-*.md` files
3. Done! Your Skill now has your own brand identity.

### Option 2: Add New Styles

1. Create `styles/style-{name}.md` (e.g., `style-corporate.md`)
2. Follow the format in existing style files
3. Use with `--style {name}`

### Example: Custom Brand Palette

Edit `styles/brand-colors.md`:

```markdown
## Core / 核心色
| Your Brand Color | `#XXXXXX` | Your main color |

## Accent / 点缀色
| Your Accent | `#XXXXXX` | Your accent color |
```

## Configuration Reference

### Mermaid Engine Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `-s` | `3` | 3x scale for high-resolution output |
| `-w` | `1600` | 1600px width |
| `-b` | `white` | White background (light style) |
| `-t` | `neutral` | Neutral theme |

**Full command:**
```bash
mmdc -i input.mmd -o output.png -s 3 -w 1600 -b white
```

**Mermaid Best Practices:**

This skill follows the style guidelines from [mermaid-visualizer](https://github.com/axtonliu/axton-obsidian-visual-skills):

- Use `subgraph id["Display Name"]` format for groups with spaces
- Reference nodes by ID, not display text
- Avoid `number. space` patterns (use `①②③` or `(1)(2)(3)` instead)
- Apply consistent color coding per layer/category
- Use `direction LR` inside subgraphs for horizontal layouts

### Gemini Engine Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Model | `gemini-3-pro-image-preview` | 2K quality, best for illustrations |
| Content Aspect | 3:4 portrait | Optimized for article embedding |
| Cover Aspect | 16:9 landscape | Platform-ready cover format |
| Cover Text | **None** | Clean visual, title shown by platform |

### Brand Color Palette (Default: Axton Brand)

| Name | Hex | Usage |
|------|-----|-------|
| Deep Space Violet | `#2F2B42` | Core color, dark backgrounds |
| Amber | `#F59E0B` | Accent, highlights, Skills layer |
| Sky Blue | `#38BDF8` | Accent, secondary highlights, Agents layer |
| Light Gray | `#F8F9FA` | Light backgrounds, neutral elements |

### Style Files

| File | Purpose | Aspect |
|------|---------|--------|
| `styles/style-light.md` | Content illustrations (default) | 3:4 portrait |
| `styles/style-dark.md` | Cover images | 16:9 landscape |
| `styles/style-minimal.md` | Technical docs | 3:4 portrait |
| `styles/brand-colors.md` | Color palette reference | - |

## Cost

When using Gemini API for auto-generation:

| Model | Price | Quality |
|-------|-------|---------|
| `gemini-3-pro-image-preview` | $0.134/image ≈ ¥1/image | 2K (default) |

Get API Key: https://aistudio.google.com/apikey

## Contributing

Contributions welcome (low-maintenance project):

- Reproducible bug reports (input + output + steps + environment)
- Documentation improvements
- Small PRs (fixes/docs)

> **Note:** Feature requests may not be acted on due to limited maintenance capacity.

## Acknowledgments

This project builds upon these excellent tools:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Anthropic's AI coding assistant
- [Mermaid](https://mermaid.js.org/) - Diagramming and charting tool
- [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) - Command line interface for Mermaid
- [Gemini API](https://ai.google.dev/) - Google's image generation API
- [Bun](https://bun.sh/) - Fast JavaScript runtime

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**Axton Liu** - AI Educator & Creator

- Website: [axtonliu.ai](https://www.axtonliu.ai)
- YouTube: [@AxtonLiu](https://youtube.com/@AxtonLiu)
- Twitter/X: [@axtonliu](https://twitter.com/axtonliu)

### Learn More

- [Claude Skills 万字长文：从指令到资产的系统化构建指南](https://www.axtonliu.ai/newsletters/ai-2/posts/claude-agent-skills-maps-framework) - Complete methodology
- [AI Elite Weekly Newsletter](https://www.axtonliu.ai/newsletters/ai-2) - Weekly AI insights
- [Free AI Course](https://www.axtonliu.ai/axton-free-course) - Get started with AI

---

© AXTONLIU™ & AI 精英学院™ 版权所有
