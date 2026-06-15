#!/usr/bin/env npx -y bun

/**
 * Image Generation Script (OpenRouter / Gemini API)
 *
 * Usage:
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts --prompt "A cute cat" --output cat.png
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts --prompt-file prompt.md --output image.png
 *
 * Style-lock (reference images):
 *   npx -y bun generate-image.ts --prompt "..." --ref style-ref.png --output image.png
 *
 * Environment:
 *   OPENROUTER_API_KEY - OpenRouter API key (preferred)
 *   GEMINI_API_KEY - Fallback: direct Gemini API key
 *
 * Models:
 *   google/gemini-3-pro-image-preview (default for OpenRouter)
 *   gemini-3-pro-image-preview (default for direct Gemini)
 */

import { writeFile, readFile, mkdir, unlink, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { loadConfig, saveConfig, mergeConfig, type Config } from './config.js';
import { analyzeCoverImage, saveLearning, getLearningsPrompt, loadLearnings } from './cover-learner.js';

// Reference image interface
interface ReferenceImage {
  mimeType: string;
  base64: string;
}

// API endpoints
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// Default models
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-pro-image-preview';
const DEFAULT_GEMINI_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_OPENAI_MODEL = 'gpt-image-2';

// Supported aspect ratios for Gemini 3 Pro Image
type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

// OpenAI image generation params
type OpenAIQuality = 'low' | 'medium' | 'high' | 'auto';
type OpenAIBackground = 'opaque' | 'auto'; // gpt-image-2 doesn't support transparent
type OpenAIOutputFormat = 'png' | 'jpeg' | 'webp';
type OpenAIModeration = 'low' | 'auto';

// Convert aspect ratio to OpenAI size string
// gpt-image-2 supports any size where: max edge ≤3840, both edges multiple of 16, ratio ≤3:1, pixels 655360-8294400
// Defaults below favor "popular sizes" listed in OpenAI docs for gpt-image-2 to maximize quality
function aspectRatioToOpenAISize(ratio: AspectRatio | undefined): string {
  switch (ratio) {
    case '1:1': return '1024x1024';     // popular square
    case '3:4': return '1024x1536';     // popular portrait
    case '4:3': return '1536x1024';     // popular landscape
    case '9:16': return '1152x2048';    // 2K portrait (multiple of 16, ratio ~9:16)
    case '16:9': return '2048x1152';    // popular 2K landscape
    case '2:3': return '1024x1536';
    case '3:2': return '1536x1024';
    case '21:9': return '2688x1152';    // ultra-wide
    case '4:5': return '1024x1280';
    case '5:4': return '1280x1024';
    default: return 'auto';
  }
}

interface OpenAIResponse {
  created?: number;
  data?: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
  usage?: unknown;
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

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

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{
        type: string;
        image_url?: { url: string };
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code?: number;
  };
}

/**
 * Load reference images and encode as base64
 * @param paths Array of image paths (max 3)
 * @returns Array of encoded images with mimeType
 */
async function loadReferenceImages(paths: string[]): Promise<ReferenceImage[]> {
  const images: ReferenceImage[] = [];

  for (const imagePath of paths.slice(0, 3)) {
    const absolutePath = isAbsolute(imagePath)
      ? imagePath
      : resolve(process.cwd(), imagePath);

    try {
      const buffer = await readFile(absolutePath);
      const ext = extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png'
                     : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                     : ext === '.webp' ? 'image/webp'
                     : 'image/png';

      images.push({
        mimeType,
        base64: buffer.toString('base64')
      });

      console.log(`Loaded reference image: ${imagePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`Warning: Failed to load reference image: ${imagePath}`);
    }
  }

  return images;
}

/**
 * Load varied style hints from prompts/varied-styles.md
 */
async function loadVariedStyleHints(): Promise<[string, string]> {
  const promptsDir = resolve(dirname(new URL(import.meta.url).pathname), '../prompts');
  const variedStylesPath = resolve(promptsDir, 'varied-styles.md');

  try {
    const content = await readFile(variedStylesPath, 'utf-8');

    // Extract Candidate 1 hint
    const candidate1Match = content.match(/## Candidate 1:[\s\S]*?\n\n(\*\*风格提示[\s\S]*?)(?=\n\n##)/);
    const candidate1 = candidate1Match
      ? '\n\n' + candidate1Match[1].trim()
      : '\n\n**风格提示（Candidate 1）**：dramatic & high-contrast（戏剧性高对比）\n- 使用强烈的明暗对比\n- 情绪张力强\n- 视觉冲击力优先';

    // Extract Candidate 2 hint
    const candidate2Match = content.match(/## Candidate 2:[\s\S]*?\n\n(\*\*风格提示[\s\S]*?)(?=\n\n---)/);
    const candidate2 = candidate2Match
      ? '\n\n' + candidate2Match[1].trim()
      : '\n\n**风格提示（Candidate 2）**：minimal & professional（极简专业）\n- 极简构图，留白充足\n- 专业、克制、高级感\n- 信息清晰优先';

    return [candidate1, candidate2];
  } catch (error) {
    console.warn('Warning: Failed to load varied style hints, using defaults');
    // Fallback to default hints
    return [
      '\n\n**风格提示（Candidate 1）**：dramatic & high-contrast（戏剧性高对比）\n- 使用强烈的明暗对比\n- 情绪张力强\n- 视觉冲击力优先',
      '\n\n**风格提示（Candidate 2）**：minimal & professional（极简专业）\n- 极简构图，留白充足\n- 专业、克制、高级感\n- 信息清晰优先'
    ];
  }
}

async function generateImageOpenAI(
  prompt: string,
  model: string,
  apiKey: string,
  options: {
    size?: string;
    quality?: OpenAIQuality;
    background?: OpenAIBackground;
    outputFormat?: OpenAIOutputFormat;
    outputCompression?: number;
    moderation?: OpenAIModeration;
    n?: number;
  } = {}
): Promise<{ imageData: Buffer; mimeType: string } | null> {
  const url = `${OPENAI_API_BASE}/images/generations`;

  const requestBody: Record<string, unknown> = {
    model,
    prompt,
  };

  if (options.size && options.size !== 'auto') requestBody.size = options.size;
  if (options.quality) requestBody.quality = options.quality;
  if (options.background) requestBody.background = options.background;
  if (options.outputFormat) requestBody.output_format = options.outputFormat;
  if (options.outputCompression !== undefined) requestBody.output_compression = options.outputCompression;
  if (options.moderation) requestBody.moderation = options.moderation;
  if (options.n && options.n > 1) requestBody.n = options.n;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data: OpenAIResponse = await response.json();

  if (data.error) {
    throw new Error(`OpenAI API Error: ${data.error.message}${data.error.code ? ` (code: ${data.error.code})` : ''}`);
  }

  const item = data.data?.[0];
  if (!item?.b64_json) {
    throw new Error('OpenAI did not return b64_json. Response: ' + JSON.stringify(data).slice(0, 1000));
  }

  const imageData = Buffer.from(item.b64_json, 'base64');
  const fmt = options.outputFormat || 'png';
  const mimeType = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
  return { imageData, mimeType };
}

async function generateImageOpenRouter(
  prompt: string,
  model: string,
  apiKey: string,
  size: 'default' | '2k' = 'default',
  aspectRatio?: AspectRatio
): Promise<{ imageData: Buffer; mimeType: string } | null> {
  const url = `${OPENROUTER_API_BASE}/chat/completions`;

  // Build request body with image_config for resolution control
  const requestBody: Record<string, unknown> = {
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    // Key: request image output modality
    modalities: ['image', 'text']
  };

  // Add image_config for resolution and aspect ratio (OpenRouter supports this for Gemini models)
  const imageConfig: Record<string, string> = {};
  if (size === '2k') {
    imageConfig.image_size = '2K';
  }
  if (aspectRatio) {
    imageConfig.aspect_ratio = aspectRatio;
  }
  if (Object.keys(imageConfig).length > 0) {
    requestBody.image_config = imageConfig;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/axtonliu/smart-illustrator',
      'X-Title': 'Smart Illustrator'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const choice = data.choices?.[0];
  const message = choice?.message;

  // Format 1: Official OpenRouter format - images array in message
  // Per official docs: response.choices[0].message.images[].image_url.url
  if (message?.images && Array.isArray(message.images)) {
    for (const image of message.images) {
      const imageUrl = image?.image_url?.url;
      if (imageUrl) {
        const base64Match = imageUrl.match(/data:image\/([^;]+);base64,(.+)/);
        if (base64Match) {
          const mimeType = `image/${base64Match[1]}`;
          const imageData = Buffer.from(base64Match[2], 'base64');
          return { imageData, mimeType };
        }
      }
    }
  }

  // Format 2: content as array with image parts
  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      // Check image_url format
      if (part.type === 'image_url' && part.image_url?.url) {
        const base64Match = part.image_url.url.match(/data:image\/([^;]+);base64,(.+)/);
        if (base64Match) {
          const mimeType = `image/${base64Match[1]}`;
          const imageData = Buffer.from(base64Match[2], 'base64');
          return { imageData, mimeType };
        }
      }
      // Check inline_data format (Gemini-style)
      if (part.inline_data?.data) {
        const imageData = Buffer.from(part.inline_data.data, 'base64');
        return { imageData, mimeType: part.inline_data.mime_type || 'image/png' };
      }
    }
  }

  // Format 3: content as string with base64
  if (typeof content === 'string') {
    const base64Match = content.match(/data:image\/([^;]+);base64,(.+)/);
    if (base64Match) {
      const mimeType = `image/${base64Match[1]}`;
      const imageData = Buffer.from(base64Match[2], 'base64');
      return { imageData, mimeType };
    }
  }

  // Debug: show what we got
  throw new Error('OpenRouter did not return an image. Response: ' + JSON.stringify(data).slice(0, 1000));
}

async function generateImageGemini(
  prompt: string,
  model: string,
  apiKey: string,
  size: 'default' | '2k' = 'default',
  references: ReferenceImage[] = [],
  aspectRatio?: AspectRatio
): Promise<{ imageData: Buffer; mimeType: string } | null> {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  // Build generation config based on size and aspect ratio
  const generationConfig: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT']
  };

  // Add imageConfig for resolution and aspect ratio
  const imageConfig: Record<string, string> = {};
  if (size === '2k') {
    imageConfig.imageSize = '2K';
  }
  if (aspectRatio) {
    imageConfig.aspectRatio = aspectRatio;
  }
  if (Object.keys(imageConfig).length > 0) {
    generationConfig.imageConfig = imageConfig;
  }

  // Build parts array with optional reference images
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add reference images first (style-lock)
  if (references.length > 0) {
    parts.push({
      text: '以下图片是风格参考。请匹配它们的视觉风格、色彩搭配和艺术手法：'
    });

    for (const ref of references) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.base64
        }
      });
    }

    parts.push({
      text: '---\n请按照上述风格生成新图片：'
    });
  }

  // Add main prompt
  parts.push({
    text: prompt
  });

  const requestBody = {
    contents: [
      {
        parts
      }
    ],
    generationConfig
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message} (code: ${data.error.code})`);
  }

  if (!data.candidates?.[0]?.content?.parts) {
    throw new Error('No content in response');
  }

  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData?.data) {
      const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
      return {
        imageData: imageBuffer,
        mimeType: part.inlineData.mimeType
      };
    }
  }

  return null;
}

/**
 * Map an image mime type to its canonical file extension (with leading dot).
 */
function mimeTypeToExt(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  return '.png';
}

/**
 * Convert an image to a different on-disk format using macOS sips (zero dependency).
 * `targetExt` is one of '.png' | '.jpg' | '.webp'. Returns when conversion completes.
 */
async function convertFormat(srcPath: string, destPath: string, targetExt: string, quality: number = 90): Promise<void> {
  const ext = targetExt.toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    await convertToJpg(srcPath, destPath, quality);
    return;
  }
  const fmt = ext === '.webp' ? 'webp' : 'png';
  if (srcPath !== destPath) {
    const data = await readFile(srcPath);
    await writeFile(destPath, data);
  }
  const proc = Bun.spawn(['sips', '-s', 'format', fmt, destPath], {
    stdout: 'pipe',
    stderr: 'pipe'
  });
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`sips conversion to ${fmt} failed with exit code ${proc.exitCode}`);
  }
}

/**
 * Convert PNG to JPG using macOS sips (zero dependency).
 * Also handles size-based auto-compression for files > maxSizeKB.
 */
async function convertToJpg(pngPath: string, jpgPath: string, quality: number = 90): Promise<void> {
  // If pngPath and jpgPath are different, copy first
  if (pngPath !== jpgPath) {
    const data = await readFile(pngPath);
    await writeFile(jpgPath, data);
  }

  const proc = Bun.spawn(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), jpgPath], {
    stdout: 'pipe',
    stderr: 'pipe'
  });
  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(`sips conversion failed with exit code ${proc.exitCode}`);
  }
}

/**
 * Ensure output file is under maxSize. Converts PNG/WebP to JPG, then loops
 * the JPG quality down (90→80→70→60, floor 60), re-stat'ing each pass until
 * under the limit or the floor is hit. Returns the final real path (extension
 * may change to .jpg); callers must use the returned path, not assume .png.
 */
async function ensureFileSize(filePath: string, maxSizeKB: number = 5000): Promise<string> {
  const fileInfo = await stat(filePath);
  const sizeKB = fileInfo.size / 1024;

  if (sizeKB <= maxSizeKB) return filePath;

  const ext = extname(filePath).toLowerCase();
  console.log(`\n⚠ File size ${(sizeKB / 1024).toFixed(1)} MB exceeds ${(maxSizeKB / 1024).toFixed(0)} MB limit`);

  // Target a JPG (best size/quality tradeoff). Convert PNG/WebP to JPG first.
  let jpgPath = filePath;
  if (ext !== '.jpg' && ext !== '.jpeg') {
    jpgPath = filePath.replace(/\.[^.]+$/i, '.jpg');
    console.log(`  Converting to JPG: ${jpgPath}`);
    await convertToJpg(filePath, jpgPath, 90);
    if (jpgPath !== filePath) await unlink(filePath); // Remove the original
  }

  // Re-stat and loop quality down until under the limit (floor at 60).
  const QUALITY_FLOOR = 60;
  for (const quality of [90, 80, 70, 60]) {
    const info = await stat(jpgPath);
    if (info.size / 1024 <= maxSizeKB) break;
    if (quality === 90 && jpgPath !== filePath) {
      // Already encoded at 90 during the PNG/WebP conversion above; skip redundant pass.
      continue;
    }
    console.log(`  Recompressing JPG with quality ${quality}...`);
    await convertToJpg(jpgPath, jpgPath, quality);
  }

  const finalInfo = await stat(jpgPath);
  if (finalInfo.size / 1024 > maxSizeKB) {
    console.log(`  ⚠ Still ${(finalInfo.size / 1024 / 1024).toFixed(1)} MB after quality ${QUALITY_FLOOR}; keeping smallest result.`);
  }

  return jpgPath;
}

function printUsage(): never {
  console.log(`
Image Generation Script (OpenRouter / Gemini / OpenAI)

Usage:
  npx -y bun generate-image.ts --prompt "description" --output image.png
  npx -y bun generate-image.ts --prompt-file prompt.md --output image.jpg

Options:
  -p, --prompt <text>       Image description
  -f, --prompt-file <path>  Read prompt from file
  -o, --output <path>       Output image path (.png or .jpg; .jpg auto-converts)
  -m, --model <model>       Model to use
  --provider <provider>     API provider: openrouter (default) | gemini | openai
  --size <size>             Image size: 2k (2048px, default) or default (~1.4K)
  -a, --aspect-ratio <ratio>  Aspect ratio: 1:1, 3:4, 4:3, 9:16, 16:9, 21:9, etc.
  --jpg-quality <n>         JPG quality 1-100 (default: 90)
  --max-size <kb>           Auto-compress if file exceeds this size in KB (default: 5000)
  -h, --help                Show this help

OpenAI-specific Options (when --provider openai):
  --openai-quality <q>      low | medium | high | auto (default: auto)
  --openai-background <b>   opaque | auto (default: auto; gpt-image-2 has no transparent)
  --openai-format <f>       png (default) | jpeg | webp
  --openai-moderation <m>   low | auto (default: auto)

Style-lock Options (reference images):
  -r, --ref <path>          Reference image for style (can use multiple, max 3)
  --ref-weight <0-1>        Reference image weight (default: 1.0, not yet implemented)

Quality Router Options (multi-candidate generation):
  -c, --candidates <n>      Generate multiple candidates (default: 1, max: 4)
                            Output files: output-1.png, output-2.png, etc.

Style Configuration (persistent settings):
  --save-config             Save current settings to project config (.smart-illustrator/config.json)
  --save-config-global      Save current settings to user config (~/.smart-illustrator/config.json)
  --no-config               Ignore config files, use only command-line arguments

Cover Learning (learn from high-performing covers):
  --learn-cover <path>      Analyze a cover image and save learnings
  --learn-note <text>       Note for the learning (e.g., "CTR 8.5%")
  --show-learnings          Show current cover learnings
  --varied                  Generate varied styles (2 candidates with different approaches)

Environment Variables (in order of auto-detection priority):
  OPENROUTER_API_KEY        OpenRouter API key (preferred, has spending limits)
  GEMINI_API_KEY            Direct Gemini API key (fallback)
  OPENAI_API_KEY            OpenAI API key (requires --provider openai or no other key set)

Models:
  OpenRouter: google/gemini-3-pro-image-preview (default)
  Gemini:     gemini-3-pro-image-preview (default)
  OpenAI:     gpt-image-2 (default; also supports gpt-image-1.5 / gpt-image-1 / gpt-image-1-mini)

Examples:
  # Using OpenRouter (default if OPENROUTER_API_KEY set)
  OPENROUTER_API_KEY=xxx npx -y bun generate-image.ts -p "A futuristic city" -o city.png

  # Using direct Gemini API
  GEMINI_API_KEY=xxx npx -y bun generate-image.ts -p "A cute cat" -o cat.png --provider gemini

  # Using OpenAI gpt-image-2
  OPENAI_API_KEY=xxx npx -y bun generate-image.ts -p "A futuristic city" -o city.png --provider openai

  # OpenAI with explicit quality and aspect ratio
  OPENAI_API_KEY=xxx npx -y bun generate-image.ts \\
    -p "A tech diagram" -o diagram.png \\
    --provider openai --openai-quality high -a 16:9

  # From prompt file
  npx -y bun generate-image.ts -f illustration-prompt.md -o illustration.png

  # With style reference (style-lock; Gemini only)
  GEMINI_API_KEY=xxx npx -y bun generate-image.ts -p "A tech diagram" -r style-ref.png -o output.png

  # Generate 2 candidates for quality selection
  npx -y bun generate-image.ts -p "A tech diagram" -c 2 -o output.png

Note: Reference images require Gemini API (OpenRouter / OpenAI generations endpoint do not support multimodal input here).
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  let prompt: string | null = null;
  let promptFile: string | null = null;
  let output = 'generated.png';
  let model: string | null = null;
  let provider: 'openrouter' | 'gemini' | 'openai' | null = null;
  let size: 'default' | '2k' = '2k';  // Default to 2K resolution
  let aspectRatio: AspectRatio | undefined;
  // OpenAI-specific options
  let openaiQuality: OpenAIQuality | undefined;
  let openaiBackground: OpenAIBackground | undefined;
  let openaiOutputFormat: OpenAIOutputFormat | undefined;
  let openaiModeration: OpenAIModeration | undefined;
  const refPaths: string[] = [];
  let refWeight = 1.0;
  let candidates = 1;
  let shouldSaveConfig = false;
  let saveConfigGlobal = false;
  let noConfig = false;
  let learnCoverPath: string | null = null;
  let learnNote: string | null = null;
  let showLearnings = false;
  let variedMode = false;
  let jpgQuality = 90;
  let maxSizeKB = 5000; // 5MB default upload limit

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        printUsage();
        break;
      case '-p':
      case '--prompt':
        prompt = args[++i];
        break;
      case '-f':
      case '--prompt-file':
        promptFile = args[++i];
        break;
      case '-o':
      case '--output':
        output = args[++i];
        break;
      case '-m':
      case '--model':
        model = args[++i];
        break;
      case '--provider':
        provider = args[++i] as 'openrouter' | 'gemini' | 'openai';
        break;
      case '--openai-quality':
        openaiQuality = args[++i] as OpenAIQuality;
        break;
      case '--openai-background':
        openaiBackground = args[++i] as OpenAIBackground;
        break;
      case '--openai-format':
        openaiOutputFormat = args[++i] as OpenAIOutputFormat;
        break;
      case '--openai-moderation':
        openaiModeration = args[++i] as OpenAIModeration;
        break;
      case '--size':
        size = args[++i] as 'default' | '2k';
        break;
      case '--aspect-ratio':
      case '-a':
        aspectRatio = args[++i] as AspectRatio;
        break;
      case '-r':
      case '--ref':
      case '--reference':
        refPaths.push(args[++i]);
        break;
      case '--ref-weight':
        refWeight = parseFloat(args[++i]);
        break;
      case '-c':
      case '--candidates':
        candidates = Math.min(4, Math.max(1, parseInt(args[++i], 10) || 1));
        break;
      case '--save-config':
        shouldSaveConfig = true;
        break;
      case '--save-config-global':
        shouldSaveConfig = true;
        saveConfigGlobal = true;
        break;
      case '--no-config':
        noConfig = true;
        break;
      case '--learn-cover':
        learnCoverPath = args[++i];
        break;
      case '--learn-note':
        learnNote = args[++i];
        break;
      case '--show-learnings':
        showLearnings = true;
        break;
      case '--varied':
        variedMode = true;
        candidates = 2;  // Varied mode generates 2 different approaches
        break;
      case '--jpg-quality':
        jpgQuality = Math.min(100, Math.max(1, parseInt(args[++i], 10) || 90));
        break;
      case '--max-size':
        maxSizeKB = parseInt(args[++i], 10) || 5000;
        break;
    }
  }

  // Handle --show-learnings
  if (showLearnings) {
    const learnings = await loadLearnings();
    if (!learnings) {
      console.log('No cover learnings found yet.');
      console.log('Learn from a high-performing cover:');
      console.log('  npx -y bun generate-image.ts --learn-cover my-best-thumbnail.png');
    } else {
      const { readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const { homedir } = await import('node:os');
      const learningsPath = join(homedir(), '.smart-illustrator', 'cover-learnings.md');
      const content = await readFile(learningsPath, 'utf-8');
      console.log(content);
    }
    process.exit(0);
  }

  // Handle --learn-cover
  if (learnCoverPath) {
    console.log('Analyzing cover image...');
    const analysis = await analyzeCoverImage(learnCoverPath, learnNote || undefined);
    if (analysis) {
      await saveLearning(analysis);
      console.log('\n✓ Learning completed successfully!');
      console.log('\nNext time you generate a cover, these learnings will be automatically applied.');
    } else {
      console.error('Failed to analyze cover image');
      process.exit(1);
    }
    process.exit(0);
  }

  // Load config unless --no-config is specified
  let loadedConfig: Config = {};
  if (!noConfig) {
    try {
      loadedConfig = loadConfig(process.cwd());
    } catch (error) {
      // Config loading errors are not fatal
      console.warn('Warning: Failed to load config:', error);
    }
  }

  // Merge config with CLI arguments (CLI args take precedence)
  const finalConfig = mergeConfig(loadedConfig, {
    references: refPaths.length > 0 ? refPaths : undefined
  });

  // Apply merged config to variables
  if (finalConfig.references && finalConfig.references.length > 0 && refPaths.length === 0) {
    refPaths.push(...finalConfig.references);
    console.log(`Using ${finalConfig.references.length} reference image(s) from config`);
  }

  // Determine provider and API key
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Auto-detect provider if not specified
  // Prefer OpenRouter (has spending limits) over direct Gemini; OpenAI requires explicit --provider
  if (!provider) {
    if (openrouterKey) {
      provider = 'openrouter';
    } else if (geminiKey) {
      provider = 'gemini';
    } else if (openaiKey) {
      provider = 'openai';
    } else {
      console.error('Error: No API key found');
      console.error('Set OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY environment variable');
      process.exit(1);
    }
  }

  // Reference images require Gemini API (OpenRouter / OpenAI generations endpoint don't support multimodal input here)
  if (refPaths.length > 0 && provider !== 'gemini') {
    if (geminiKey) {
      console.log(`Note: Reference images require Gemini API. Switching from ${provider} to Gemini...`);
      provider = 'gemini';
    } else {
      console.error('Error: Reference images require GEMINI_API_KEY (OpenRouter / OpenAI generations endpoint do not support multimodal input)');
      process.exit(1);
    }
  }

  // Validate API key for chosen provider
  let apiKey: string | undefined;
  if (provider === 'openrouter') apiKey = openrouterKey;
  else if (provider === 'gemini') apiKey = geminiKey;
  else if (provider === 'openai') apiKey = openaiKey;

  if (!apiKey) {
    const envName = provider === 'openrouter' ? 'OPENROUTER_API_KEY'
                  : provider === 'gemini' ? 'GEMINI_API_KEY'
                  : 'OPENAI_API_KEY';
    console.error(`Error: ${envName} is required for ${provider} provider`);
    process.exit(1);
  }

  // Set default model based on provider
  if (!model) {
    model = provider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL
          : provider === 'gemini' ? DEFAULT_GEMINI_MODEL
          : DEFAULT_OPENAI_MODEL;
  }

  if (promptFile) {
    prompt = await readFile(promptFile, 'utf-8');
  }

  if (!prompt) {
    console.error('Error: --prompt or --prompt-file is required');
    process.exit(1);
  }

  // Load cover learnings if this is a cover generation task
  const isCoverGeneration = prompt.toLowerCase().includes('cover') ||
                            prompt.includes('封面') ||
                            prompt.includes('youtube') ||
                            prompt.includes('thumbnail');

  if (isCoverGeneration) {
    const learningsPrompt = await getLearningsPrompt();
    if (learningsPrompt) {
      prompt += learningsPrompt;
      console.log('✓ Applied cover learnings from history');
    }
  }

  console.log(`Provider: ${provider}`);
  console.log(`Model: ${model}`);
  console.log(`Size: ${size}`);
  if (aspectRatio) {
    console.log(`Aspect ratio: ${aspectRatio}`);
  }
  if (refPaths.length > 0) {
    console.log(`Reference images: ${refPaths.length}`);
  }
  if (candidates > 1) {
    console.log(`Candidates: ${candidates}`);
  }
  console.log(`Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`);

  try {
    // Load reference images if provided
    const references = refPaths.length > 0 ? await loadReferenceImages(refPaths) : [];

    // Ensure output directory exists
    await mkdir(dirname(output), { recursive: true });

    // Generate multiple candidates if requested
    const generatedFiles: string[] = [];
    const ext = extname(output);
    const baseName = output.slice(0, -ext.length);

    for (let i = 1; i <= candidates; i++) {
      const candidateOutput = candidates > 1 ? `${baseName}-${i}${ext}` : output;

      // Prepare prompt with varied style if in varied mode
      let finalPrompt = prompt;
      if (variedMode && isCoverGeneration) {
        const styleHints = await loadVariedStyleHints();
        finalPrompt = prompt + (styleHints[i - 1] || styleHints[0]);
        console.log(candidates > 1 ? `\nGenerating candidate ${i}/${candidates} (${i === 1 ? 'Dramatic' : 'Minimal'})...` : '\nGenerating image...');
      } else {
        console.log(candidates > 1 ? `\nGenerating candidate ${i}/${candidates}...` : '\nGenerating image...');
      }

      let result;

      if (provider === 'openrouter') {
        result = await generateImageOpenRouter(finalPrompt, model, apiKey, size, aspectRatio);
      } else if (provider === 'openai') {
        // Convert aspect ratio to OpenAI size string; --openai-quality etc. take precedence
        const openaiSize = aspectRatio ? aspectRatioToOpenAISize(aspectRatio) : 'auto';
        result = await generateImageOpenAI(finalPrompt, model, apiKey, {
          size: openaiSize,
          quality: openaiQuality,
          background: openaiBackground,
          outputFormat: openaiOutputFormat,
          moderation: openaiModeration,
        });
      } else {
        result = await generateImageGemini(finalPrompt, model, apiKey, size, references, aspectRatio);
      }

      if (!result) {
        console.error(`Error: No image generated for candidate ${i}`);
        continue;
      }

      // Source of truth for the on-disk format is the bytes actually returned,
      // not the user's requested output extension. Write the raw bytes first
      // to a temp path whose extension matches the real format.
      const actualExt = mimeTypeToExt(result.mimeType);
      const desiredExt = extname(candidateOutput).toLowerCase() || actualExt;
      const baseNoExt = candidateOutput.slice(0, candidateOutput.length - (extname(candidateOutput).length || 0));
      const rawPath = `${baseNoExt}${actualExt}`;

      await writeFile(rawPath, result.imageData);
      console.log(`✓ Saved: ${rawPath} (${(result.imageData.length / 1024).toFixed(1)} KB, ${result.mimeType})`);

      let finalPath = rawPath;

      // If the requested extension differs from the actual format, do a real
      // conversion (not just a rename) so extension and bytes stay consistent.
      if (desiredExt !== actualExt) {
        const isJpgTarget = desiredExt === '.jpg' || desiredExt === '.jpeg';
        console.log(`  Converting ${actualExt} → ${desiredExt}${isJpgTarget ? ` (quality: ${jpgQuality})` : ''}...`);
        await convertFormat(rawPath, candidateOutput, desiredExt, jpgQuality);
        if (candidateOutput !== rawPath) await unlink(rawPath); // Remove temp raw file
        finalPath = candidateOutput;
        const convInfo = await stat(finalPath);
        console.log(`✓ Converted: ${finalPath} (${(convInfo.size / 1024).toFixed(1)} KB)`);
      }

      // Auto-compress if exceeds max size (may switch format/extension to JPG).
      const beforeCompress = finalPath;
      finalPath = await ensureFileSize(finalPath, maxSizeKB);
      if (finalPath !== beforeCompress) {
        // Path changed (auto-converted to JPG due to size)
        const compressedInfo = await stat(finalPath);
        console.log(`✓ Compressed: ${finalPath} (${(compressedInfo.size / 1024).toFixed(1)} KB)`);
      }

      generatedFiles.push(finalPath);
    }

    // Summary
    if (generatedFiles.length === 0) {
      console.error('Error: No images were generated');
      process.exit(1);
    }

    if (candidates > 1) {
      console.log(`\n=== Quality Router: ${generatedFiles.length} candidates generated ===`);
      generatedFiles.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
      console.log('\nReview the candidates and select the best one.');
    }

    // Save config if requested
    if (shouldSaveConfig && generatedFiles.length > 0) {
      const configToSave: Config = {
        references: refPaths.length > 0 ? refPaths : undefined
      };

      saveConfig(configToSave, {
        global: saveConfigGlobal,
        cwd: process.cwd()
      });

      console.log(`\n✓ Config saved to ${saveConfigGlobal ? 'user' : 'project'} config`);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
