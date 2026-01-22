#!/usr/bin/env npx -y bun

/**
 * Batch Image Generation Script
 *
 * Generates multiple images from a JSON config file.
 * Supports the unified JSON format (same as web version).
 *
 * Usage:
 *   npx -y bun batch-generate.ts --config slides.json --output-dir ./images
 *
 * Config format (unified with web version):
 *   {
 *     "instruction": "请为我绘制 N 张图片...",
 *     "batch_rules": { "total": N, "one_item_one_image": true, "aspect_ratio": "16:9" },
 *     "style": "完整的 style prompt 字符串...",
 *     "pictures": [
 *       { "id": 1, "topic": "封面", "content": "..." },
 *       { "id": 2, "topic": "...", "content": "..." }
 *     ]
 *   }
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// New unified format (same as web version)
interface PictureConfig {
  id: number;
  topic: string;
  content: string;
}

interface BatchRules {
  total: number;
  one_item_one_image?: boolean;
  aspect_ratio?: string;
  do_not_merge?: boolean;
}

interface UnifiedConfig {
  instruction?: string;
  batch_rules?: BatchRules;
  fallback?: string;
  style: string;
  pictures: PictureConfig[];
}

// Legacy format (for backward compatibility)
interface LegacyIllustration {
  id: number;
  prompt: string | object;
  filename: string;
  type?: string;
  position?: string;
}

interface LegacyConfig {
  style?: {
    mode?: string;
    background?: string;
    primary?: string;
    accent?: string[];
  };
  instructions?: string;
  illustrations: LegacyIllustration[];
}

type BatchConfig = UnifiedConfig | LegacyConfig;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

function isUnifiedConfig(config: BatchConfig): config is UnifiedConfig {
  return 'pictures' in config && Array.isArray(config.pictures);
}

function buildPromptFromUnified(picture: PictureConfig, style: string): string {
  // Combine style + topic + content into a single prompt
  return `${style}

---

请为以下内容生成一张信息图：

**主题方向**: ${picture.topic}

**内容**:
${picture.content}`;
}

function buildPromptFromLegacy(
  illustration: LegacyIllustration,
  style?: LegacyConfig['style']
): string {
  let prompt = '';

  if (style) {
    prompt += `Style: ${style.mode || 'light'} mode, `;
    prompt += `background ${style.background || '#F8F9FA'}, `;
    prompt += `primary color ${style.primary || '#2F2B42'}, `;
    if (style.accent) {
      prompt += `accent colors ${style.accent.join(', ')}. `;
    }
  }

  if (typeof illustration.prompt === 'string') {
    prompt += illustration.prompt;
  } else {
    prompt += JSON.stringify(illustration.prompt);
  }

  return prompt;
}

async function generateImage(
  prompt: string,
  model: string,
  apiKey: string
): Promise<Buffer | null> {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Generate an image: ${prompt}`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        imageSize: '2K'
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  if (!data.candidates?.[0]?.content?.parts) {
    return null;
  }

  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printUsage(): never {
  console.log(`
Batch Image Generation Script

Usage:
  npx -y bun batch-generate.ts --config slides.json --output-dir ./images

Options:
  -c, --config <path>       JSON config file (unified format, same as web version)
  -o, --output-dir <path>   Output directory (default: ./illustrations)
  -m, --model <model>       Model to use (default: gemini-3-pro-image-preview)
  -d, --delay <ms>          Delay between requests in ms (default: 2000)
  -p, --prefix <text>       Filename prefix (default: from config filename)
  -h, --help                Show this help

Environment:
  GEMINI_API_KEY            Required. Get from https://aistudio.google.com/apikey

Config File Format (Unified - same JSON as web version):
  {
    "instruction": "请为我绘制 7 张图片（generate 7 images）...",
    "batch_rules": {
      "total": 7,
      "one_item_one_image": true,
      "aspect_ratio": "16:9",
      "do_not_merge": true
    },
    "fallback": "如果无法一次生成全部图片...",
    "style": "完整的 style prompt（从 styles/style-light.md 复制）...",
    "pictures": [
      { "id": 1, "topic": "封面", "content": "Agent Skills 完全指南\\n\\n第1节：..." },
      { "id": 2, "topic": "核心概念", "content": "Skills 是什么..." }
    ]
  }

Output Filenames:
  {prefix}-{id:02d}.png  (e.g., SKILL_01-01.png, SKILL_01-02.png)
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  let configPath: string | null = null;
  let outputDir = './illustrations';
  let model = 'gemini-3-pro-image-preview';
  let delay = 2000;
  let prefix: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        printUsage();
        break;
      case '-c':
      case '--config':
        configPath = args[++i];
        break;
      case '-o':
      case '--output-dir':
        outputDir = args[++i];
        break;
      case '-m':
      case '--model':
        model = args[++i];
        break;
      case '-d':
      case '--delay':
        delay = parseInt(args[++i], 10);
        break;
      case '-p':
      case '--prefix':
        prefix = args[++i];
        break;
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is required');
    console.error('Get your API key from: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  if (!configPath) {
    console.error('Error: --config is required');
    process.exit(1);
  }

  const configContent = await readFile(configPath, 'utf-8');
  const config: BatchConfig = JSON.parse(configContent);

  // Auto-detect prefix from config filename if not specified
  if (!prefix) {
    prefix = basename(configPath, '.json').replace(/-slides$/, '');
  }

  await mkdir(outputDir, { recursive: true });

  // Handle unified format vs legacy format
  if (isUnifiedConfig(config)) {
    // Unified format (new)
    const total = config.pictures.length;
    let success = 0;
    let failed = 0;

    console.log(`\nBatch Image Generation (Unified Format)`);
    console.log(`=======================================`);
    console.log(`Model: ${model}`);
    console.log(`Total: ${total} images`);
    console.log(`Prefix: ${prefix}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Delay: ${delay}ms between requests\n`);

    for (const picture of config.pictures) {
      const prompt = buildPromptFromUnified(picture, config.style);
      const filename = `${prefix}-${String(picture.id).padStart(2, '0')}.png`;
      const outputPath = join(outputDir, filename);

      console.log(`[${picture.id}/${total}] Generating: ${filename}`);
      console.log(`  Topic: ${picture.topic}`);

      try {
        const imageBuffer = await generateImage(prompt, model, apiKey);

        if (imageBuffer) {
          await mkdir(dirname(outputPath), { recursive: true });
          await writeFile(outputPath, imageBuffer);
          console.log(`  ✓ Saved (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
          success++;
        } else {
          console.log(`  ✗ No image generated`);
          failed++;
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
        failed++;
      }

      if (picture.id < total) {
        console.log(`  Waiting ${delay}ms...`);
        await sleep(delay);
      }
    }

    console.log(`\n=======================================`);
    console.log(`Complete: ${success}/${total} succeeded, ${failed} failed`);
    console.log(`Output directory: ${outputDir}`);

  } else {
    // Legacy format (backward compatibility)
    const legacyConfig = config as LegacyConfig;

    if (!legacyConfig.illustrations || legacyConfig.illustrations.length === 0) {
      console.error('Error: No illustrations in config');
      process.exit(1);
    }

    const total = legacyConfig.illustrations.length;
    let success = 0;
    let failed = 0;

    console.log(`\nBatch Image Generation (Legacy Format)`);
    console.log(`======================================`);
    console.log(`Model: ${model}`);
    console.log(`Total: ${total} images`);
    console.log(`Output: ${outputDir}\n`);

    for (const illustration of legacyConfig.illustrations) {
      const prompt = buildPromptFromLegacy(illustration, legacyConfig.style);
      const outputPath = join(outputDir, illustration.filename);

      console.log(`[${illustration.id}/${total}] Generating: ${illustration.filename}`);

      try {
        const imageBuffer = await generateImage(prompt, model, apiKey);

        if (imageBuffer) {
          await mkdir(dirname(outputPath), { recursive: true });
          await writeFile(outputPath, imageBuffer);
          console.log(`  ✓ Saved (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
          success++;
        } else {
          console.log(`  ✗ No image generated`);
          failed++;
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
        failed++;
      }

      if (illustration.id < total) {
        await sleep(delay);
      }
    }

    console.log(`\n======================================`);
    console.log(`Complete: ${success}/${total} succeeded, ${failed} failed`);
    console.log(`Output directory: ${outputDir}`);
  }
}

main();
