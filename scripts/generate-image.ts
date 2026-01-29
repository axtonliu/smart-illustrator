#!/usr/bin/env npx -y bun

/**
 * Image Generation Script (OpenRouter / Gemini API)
 *
 * Usage:
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts --prompt "A cute cat" --output cat.png
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts --prompt-file prompt.md --output image.png
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
import { dirname } from 'node:path';

// API endpoints
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Default models
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-pro-image-preview';
const DEFAULT_GEMINI_MODEL = 'gemini-3-pro-image-preview';

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

async function generateImageOpenRouter(
  prompt: string,
  model: string,
  apiKey: string,
  size: 'default' | '2k' = 'default'
): Promise<{ imageData: Buffer; mimeType: string } | null> {
  // For 2K, add size hint to prompt (OpenRouter doesn't support imageConfig)
  const sizeHint = size === '2k' ? ' Output in 2K resolution (2048x2048 or similar high resolution).' : '';
  const fullPrompt = prompt + sizeHint;
  const url = `${OPENROUTER_API_BASE}/chat/completions`;

  // OpenRouter with Gemini image model - use modalities parameter per official docs
  const requestBody = {
    model: model,
    messages: [
      {
        role: 'user',
        content: fullPrompt
      }
    ],
    // Key: request image output modality
    modalities: ['image', 'text']
  };

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
  size: 'default' | '2k' = 'default'
): Promise<{ imageData: Buffer; mimeType: string } | null> {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  // Build generation config based on size
  const generationConfig: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT']
  };

  // Only add imageConfig for 2K resolution
  if (size === '2k') {
    generationConfig.imageConfig = { imageSize: '2K' };
  }

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
  --size <size>             Image size: default (~1.4K) or 2k (2048px)
  -h, --help                Show this help

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
  let size: 'default' | '2k' = 'default';

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
    }
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

  // Validate API key for chosen provider
  const apiKey = provider === 'openrouter' ? openrouterKey : geminiKey;
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

  console.log(`Provider: ${provider}`);
  console.log(`Model: ${model}`);
  console.log(`Size: ${size}`);
  console.log(`Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`);

  try {
    let result;

    if (provider === 'openrouter') {
      result = await generateImageOpenRouter(prompt, model, apiKey, size);
    } else {
      result = await generateImageGemini(prompt, model, apiKey, size);
    }

    if (!result) {
      console.error('Error: No image generated');
      process.exit(1);
    }

    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, result.imageData);

    console.log(`Image saved to: ${output}`);
    console.log(`Size: ${(result.imageData.length / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
