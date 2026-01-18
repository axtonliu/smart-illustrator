#!/usr/bin/env npx -y bun

/**
 * Gemini API Image Generation Script
 *
 * Usage:
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts --prompt "A cute cat" --output cat.png
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/generate-image.ts --prompt-file prompt.md --output image.png
 *
 * Environment:
 *   GEMINI_API_KEY - Required. Get from https://aistudio.google.com/apikey
 *
 * Models:
 *   --model gemini-3-pro-image-preview (default, Nano-Banana Pro, 2K quality)
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

async function generateImage(
  prompt: string,
  model: string,
  apiKey: string
): Promise<{ imageData: Buffer; mimeType: string } | null> {
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
      responseModalities: ['IMAGE', 'TEXT']
    }
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
Gemini Image Generation Script

Usage:
  npx -y bun generate-image.ts --prompt "description" --output image.png
  npx -y bun generate-image.ts --prompt-file prompt.md --output image.png

Options:
  -p, --prompt <text>       Image description
  -f, --prompt-file <path>  Read prompt from file
  -o, --output <path>       Output image path (default: generated.png)
  -m, --model <model>       Model to use (default: gemini-3-pro-image-preview)
  -h, --help                Show this help

Environment:
  GEMINI_API_KEY            Required. Get from https://aistudio.google.com/apikey

Models:
  gemini-3-pro-image-preview (default, Nano-Banana Pro, 2K quality)

Examples:
  # Simple prompt
  npx -y bun generate-image.ts -p "A futuristic city at sunset" -o city.png

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
  let model = 'gemini-3-pro-image-preview';

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
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is required');
    console.error('Get your API key from: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  if (promptFile) {
    prompt = await readFile(promptFile, 'utf-8');
  }

  if (!prompt) {
    console.error('Error: --prompt or --prompt-file is required');
    process.exit(1);
  }

  console.log(`Generating image with ${model}...`);
  console.log(`Prompt: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`);

  try {
    const result = await generateImage(prompt, model, apiKey);

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
