#!/usr/bin/env npx -y bun

/**
 * Cover Learning Module
 *
 * Analyzes high-performing cover images and extracts patterns.
 * Learnings are saved to ~/.smart-illustrator/cover-learnings.md
 * and automatically loaded when generating new covers.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const USER_CONFIG_DIR = join(homedir(), '.smart-illustrator');
const LEARNINGS_FILE = join(USER_CONFIG_DIR, 'cover-learnings.md');

// Gemini API for image analysis
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ANALYSIS_MODEL = 'gemini-2.0-flash';

interface CoverAnalysis {
  date: string;
  source: string;
  elements: {
    composition: string;
    colorScheme: string;
    textUsage: string;
    emotion: string;
    focusPoint: string;
  };
  patterns: string[];
  avoidPatterns: string[];
}

interface LearningsData {
  analyses: CoverAnalysis[];
  distilledPatterns: {
    highCTR: string[];
    avoid: string[];
  };
  lastUpdated: string;
}

/**
 * Load learning analysis prompt from prompts/learning-analysis.md
 */
async function loadLearningAnalysisPrompt(note?: string): Promise<string> {
  const promptsDir = resolve(dirname(new URL(import.meta.url).pathname), '../prompts');
  const analysisPromptPath = resolve(promptsDir, 'learning-analysis.md');

  try {
    let content = await readFile(analysisPromptPath, 'utf-8');

    // Remove README sections (everything before first ---)
    const promptStart = content.indexOf('---');
    if (promptStart !== -1) {
      const promptEnd = content.indexOf('---', promptStart + 3);
      if (promptEnd !== -1) {
        content = content.slice(promptStart + 3, promptEnd).trim();
      }
    }

    // Replace {{USER_NOTE}} variable
    if (note) {
      content = content.replace('{{USER_NOTE}}', `用户备注：${note}`);
    } else {
      content = content.replace(/\n*{{USER_NOTE}}\n*/g, '');
    }

    return content;
  } catch (error) {
    console.warn('Warning: Failed to load learning analysis prompt, using default');
    // Fallback to default prompt
    return `你是一位 YouTube 封面图分析专家。请分析这张封面图，提取对未来封面设计有价值的模式。

请用以下 JSON 格式输出（中文）：

{
  "composition": "构图描述（如：左侧人物 + 右侧文字、中心聚焦、对比布局等）",
  "colorScheme": "配色方案（如：深色背景 + 橙色强调、高对比冷暖搭配等）",
  "textUsage": "文字使用（如：无文字、3-5个大字、数字突出等）",
  "emotion": "传达的情绪（如：好奇心、紧迫感、专业感、震惊等）",
  "focusPoint": "视觉焦点（如：人物表情、产品 logo、对比元素等）",
  "patterns": ["值得学习的模式1", "值得学习的模式2", "..."],
  "avoidPatterns": ["如果有不好的地方，列出应避免的模式"]
}

${note ? `用户备注：${note}` : ''}

只输出 JSON，不要其他内容。`;
  }
}

/**
 * Load existing learnings from file
 */
export async function loadLearnings(): Promise<LearningsData | null> {
  if (!existsSync(LEARNINGS_FILE)) {
    return null;
  }

  try {
    const content = await readFile(LEARNINGS_FILE, 'utf-8');
    return parseLearningsMarkdown(content);
  } catch (error) {
    console.warn('Warning: Failed to load cover learnings:', error);
    return null;
  }
}

/**
 * Parse markdown learnings file to structured data
 */
function parseLearningsMarkdown(content: string): LearningsData {
  const analyses: CoverAnalysis[] = [];
  const distilledPatterns = {
    highCTR: [] as string[],
    avoid: [] as string[]
  };

  // Extract distilled patterns
  const highCTRMatch = content.match(/### 高 CTR 共性\n([\s\S]*?)(?=\n###|\n---|\n## |$)/);
  if (highCTRMatch) {
    distilledPatterns.highCTR = highCTRMatch[1]
      .split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => line.slice(2).trim());
  }

  const avoidMatch = content.match(/### 应避免的模式\n([\s\S]*?)(?=\n###|\n---|\n## |$)/);
  if (avoidMatch) {
    distilledPatterns.avoid = avoidMatch[1]
      .split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => line.slice(2).trim());
  }

  // Extract last updated
  const lastUpdatedMatch = content.match(/\*\*最后更新\*\*：(.+)/);
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : new Date().toISOString().split('T')[0];

  return { analyses, distilledPatterns, lastUpdated };
}

/**
 * Analyze a cover image using Gemini Vision
 */
export async function analyzeCoverImage(
  imagePath: string,
  note?: string
): Promise<CoverAnalysis | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('Error: GEMINI_API_KEY is required for cover analysis');
    return null;
  }

  // Read and encode image
  const absolutePath = imagePath.startsWith('/') ? imagePath : join(process.cwd(), imagePath);

  if (!existsSync(absolutePath)) {
    console.error(`Error: Image not found: ${absolutePath}`);
    return null;
  }

  const imageBuffer = await readFile(absolutePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png'
                 : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                 : ext === '.webp' ? 'image/webp'
                 : 'image/png';

  console.log(`Analyzing cover image: ${basename(imagePath)}`);

  // Load analysis prompt from prompts/learning-analysis.md
  const analysisPrompt = await loadLearningAnalysisPrompt(note);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${ANALYSIS_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Image
                }
              },
              { text: analysisPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json() as any;

    if (data.error) {
      console.error('Gemini API error:', data.error.message);
      return null;
    }

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error('No analysis result from Gemini');
      return null;
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse analysis result');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      date: new Date().toISOString().split('T')[0],
      source: basename(imagePath),
      elements: {
        composition: parsed.composition || '',
        colorScheme: parsed.colorScheme || '',
        textUsage: parsed.textUsage || '',
        emotion: parsed.emotion || '',
        focusPoint: parsed.focusPoint || ''
      },
      patterns: parsed.patterns || [],
      avoidPatterns: parsed.avoidPatterns || []
    };

  } catch (error) {
    console.error('Analysis failed:', error);
    return null;
  }
}

/**
 * Save analysis to learnings file
 */
export async function saveLearning(analysis: CoverAnalysis): Promise<void> {
  // Ensure config directory exists
  if (!existsSync(USER_CONFIG_DIR)) {
    await mkdir(USER_CONFIG_DIR, { recursive: true });
  }

  // Load existing learnings
  let existingContent = '';
  let distilledPatterns = {
    highCTR: [] as string[],
    avoid: [] as string[]
  };

  if (existsSync(LEARNINGS_FILE)) {
    existingContent = await readFile(LEARNINGS_FILE, 'utf-8');
    const parsed = parseLearningsMarkdown(existingContent);
    distilledPatterns = parsed.distilledPatterns;
  }

  // Add new patterns to distilled list
  for (const pattern of analysis.patterns) {
    if (!distilledPatterns.highCTR.includes(pattern)) {
      distilledPatterns.highCTR.push(pattern);
    }
  }
  for (const pattern of analysis.avoidPatterns) {
    if (!distilledPatterns.avoid.includes(pattern)) {
      distilledPatterns.avoid.push(pattern);
    }
  }

  // Build new analysis entry
  const newEntry = `
### ${analysis.date}: ${analysis.source}
- **构图**: ${analysis.elements.composition}
- **配色**: ${analysis.elements.colorScheme}
- **文字**: ${analysis.elements.textUsage}
- **情绪**: ${analysis.elements.emotion}
- **焦点**: ${analysis.elements.focusPoint}
- **学到的模式**:
${analysis.patterns.map(p => `  - ${p}`).join('\n')}
${analysis.avoidPatterns.length > 0 ? `- **应避免**:\n${analysis.avoidPatterns.map(p => `  - ${p}`).join('\n')}` : ''}
`;

  // Build full content
  const today = new Date().toISOString().split('T')[0];
  const fullContent = `# 封面图学习记录

**最后更新**：${today}

---

## 提炼的模式（自动汇总）

### 高 CTR 共性
${distilledPatterns.highCTR.map(p => `- ${p}`).join('\n') || '- （暂无记录）'}

### 应避免的模式
${distilledPatterns.avoid.map(p => `- ${p}`).join('\n') || '- （暂无记录）'}

---

## 学习记录
${newEntry}
${existingContent.includes('## 学习记录')
  ? existingContent.split('## 学习记录')[1]
  : ''}
`;

  await writeFile(LEARNINGS_FILE, fullContent, 'utf-8');
  console.log(`✓ Learning saved to: ${LEARNINGS_FILE}`);
}

/**
 * Get learnings as prompt supplement for cover generation
 */
export async function getLearningsPrompt(): Promise<string | null> {
  const learnings = await loadLearnings();
  if (!learnings || learnings.distilledPatterns.highCTR.length === 0) {
    return null;
  }

  let prompt = '\n\n## 从历史高表现封面学到的模式（请参考）\n\n';

  if (learnings.distilledPatterns.highCTR.length > 0) {
    prompt += '### 推荐的模式\n';
    prompt += learnings.distilledPatterns.highCTR.map(p => `- ${p}`).join('\n');
    prompt += '\n\n';
  }

  if (learnings.distilledPatterns.avoid.length > 0) {
    prompt += '### 应避免的模式\n';
    prompt += learnings.distilledPatterns.avoid.map(p => `- ${p}`).join('\n');
    prompt += '\n';
  }

  return prompt;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`
Cover Learner - Analyze and learn from high-performing cover images

Usage:
  npx -y bun cover-learner.ts <image-path> [--note "optional note"]
  npx -y bun cover-learner.ts --show  # Show current learnings

Examples:
  npx -y bun cover-learner.ts my-best-thumbnail.png
  npx -y bun cover-learner.ts cover.png --note "CTR 8.5%, 这个封面效果很好"
  npx -y bun cover-learner.ts --show
`);
    process.exit(0);
  }

  if (args.includes('--show')) {
    const learnings = await loadLearnings();
    if (!learnings) {
      console.log('No learnings found yet. Analyze some covers first!');
      console.log(`Learnings file: ${LEARNINGS_FILE}`);
    } else {
      console.log(await readFile(LEARNINGS_FILE, 'utf-8'));
    }
    process.exit(0);
  }

  const imagePath = args[0];
  let note: string | undefined;

  const noteIndex = args.indexOf('--note');
  if (noteIndex !== -1 && args[noteIndex + 1]) {
    note = args[noteIndex + 1];
  }

  const analysis = await analyzeCoverImage(imagePath, note);
  if (analysis) {
    await saveLearning(analysis);

    console.log('\n--- 分析结果 ---');
    console.log(`构图: ${analysis.elements.composition}`);
    console.log(`配色: ${analysis.elements.colorScheme}`);
    console.log(`文字: ${analysis.elements.textUsage}`);
    console.log(`情绪: ${analysis.elements.emotion}`);
    console.log(`焦点: ${analysis.elements.focusPoint}`);
    console.log('\n学到的模式:');
    analysis.patterns.forEach(p => console.log(`  ✓ ${p}`));
    if (analysis.avoidPatterns.length > 0) {
      console.log('\n应避免:');
      analysis.avoidPatterns.forEach(p => console.log(`  ✗ ${p}`));
    }
  }
}

// Only run main() when executed directly (not when imported as a module)
// Bun supports import.meta.main for this check
if (import.meta.main) {
  main().catch(console.error);
}
