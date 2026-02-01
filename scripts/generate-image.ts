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

import { writeFile, readFile, mkdir } from 'node:fs/promises';
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

// Default models
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-pro-image-preview';
const DEFAULT_GEMINI_MODEL = 'gemini-3-pro-image-preview';

// Supported aspect ratios for Gemini 3 Pro Image
type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

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

function printUsage(): never {
  console.log(`
Image Generation Script (OpenRouter / Gemini API)

Usage:
  npx -y bun generate-image.ts --prompt "description" --output image.png
  npx -y bun generate-image.ts --prompt-file prompt.md --output image.png

Options:
  -p, --prompt <text>       Image description
  -f, --prompt-file <path>  Read prompt from file
  -o, --output <path>       Output image path (default: generated.png)
  -m, --model <model>       Model to use
  --provider <provider>     API provider: openrouter (default) or gemini
  --size <size>             Image size: 2k (2048px, default) or default (~1.4K)
  -a, --aspect-ratio <ratio>  Aspect ratio: 1:1, 3:4, 4:3, 9:16, 16:9, 21:9, etc.
  -h, --help                Show this help

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

Environment Variables (in order of priority):
  OPENROUTER_API_KEY        OpenRouter API key (preferred, has spending limits)
  GEMINI_API_KEY            Direct Gemini API key (fallback)

Models:
  OpenRouter: google/gemini-3-pro-image-preview (default)
  Gemini:     gemini-3-pro-image-preview (default)

Examples:
  # Using OpenRouter (default)
  OPENROUTER_API_KEY=xxx npx -y bun generate-image.ts -p "A futuristic city" -o city.png

  # Using direct Gemini API
  GEMINI_API_KEY=xxx npx -y bun generate-image.ts -p "A cute cat" -o cat.png --provider gemini

  # From prompt file
  npx -y bun generate-image.ts -f illustration-prompt.md -o illustration.png

  # With style reference (style-lock)
  GEMINI_API_KEY=xxx npx -y bun generate-image.ts -p "A tech diagram" -r style-ref.png -o output.png

  # Generate 2 candidates for quality selection
  npx -y bun generate-image.ts -p "A tech diagram" -c 2 -o output.png

Note: Reference images require Gemini API (OpenRouter does not support multimodal input).
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  let prompt: string | null = null;
  let promptFile: string | null = null;
  let output = 'generated.png';
  let model: string | null = null;
  let provider: 'openrouter' | 'gemini' | null = null;
  let size: 'default' | '2k' = '2k';  // Default to 2K resolution
  let aspectRatio: AspectRatio | undefined;
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
        provider = args[++i] as 'openrouter' | 'gemini';
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

  // Auto-detect provider if not specified
  // Prefer OpenRouter (has spending limits) over direct Gemini
  if (!provider) {
    if (openrouterKey) {
      provider = 'openrouter';
    } else if (geminiKey) {
      provider = 'gemini';
    } else {
      console.error('Error: No API key found');
      console.error('Set OPENROUTER_API_KEY or GEMINI_API_KEY environment variable');
      process.exit(1);
    }
  }

  // Reference images require Gemini API (OpenRouter doesn't support multimodal input)
  if (refPaths.length > 0 && provider === 'openrouter') {
    if (geminiKey) {
      console.log('Note: Reference images require Gemini API. Switching from OpenRouter to Gemini...');
      provider = 'gemini';
    } else {
      console.error('Error: Reference images require GEMINI_API_KEY (OpenRouter does not support multimodal input)');
      process.exit(1);
    }
  }

  // Validate API key for chosen provider
  let apiKey = provider === 'openrouter' ? openrouterKey : geminiKey;
  if (!apiKey) {
    console.error(`Error: ${provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GEMINI_API_KEY'} is required for ${provider} provider`);
    process.exit(1);
  }

  // Set default model based on provider
  if (!model) {
    model = provider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_GEMINI_MODEL;
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
      } else {
        result = await generateImageGemini(finalPrompt, model, apiKey, size, references, aspectRatio);
      }

      if (!result) {
        console.error(`Error: No image generated for candidate ${i}`);
        continue;
      }

      await writeFile(candidateOutput, result.imageData);
      generatedFiles.push(candidateOutput);

      console.log(`✓ Saved: ${candidateOutput} (${(result.imageData.length / 1024).toFixed(1)} KB)`);
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
