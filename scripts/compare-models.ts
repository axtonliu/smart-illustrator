#!/usr/bin/env npx -y bun

/**
 * Model Comparison Script
 *
 * Run the same prompt through multiple image-generation providers
 * (OpenRouter banana-pro / Gemini direct / OpenAI gpt-image-2)
 * and write side-by-side outputs so you can eyeball quality.
 *
 * Usage:
 *   npx -y bun compare-models.ts --prompt "A cute cat" --output-dir ./compare
 *   npx -y bun compare-models.ts --prompt-file prompt.md --output-dir ./compare
 *   npx -y bun compare-models.ts --prompt "..." --output-dir ./compare \
 *     --providers openrouter,openai --aspect-ratio 16:9 --openai-quality high
 *
 * Output files:
 *   ./compare/<slug>-banana-pro.png
 *   ./compare/<slug>-gemini.png
 *   ./compare/<slug>-gpt-image-2.png
 *   ./compare/<slug>-comparison.md   (markdown summary with prompt, settings, latency)
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

interface ProviderRun {
  provider: 'openrouter' | 'gemini' | 'openai';
  label: string;
  model: string;
  outputFile: string;
  durationMs?: number;
  ok: boolean;
  error?: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GENERATE_SCRIPT = resolve(SCRIPT_DIR, 'generate-image.ts');

function formatToExt(format: string): string {
  const f = format.toLowerCase();
  if (f === 'jpeg' || f === 'jpg') return '.jpg';
  if (f === 'webp') return '.webp';
  return '.png';
}

/**
 * generate-image may convert/compress the output to a different extension
 * (e.g. PNG → .jpg when over --max-size). Return the file that actually exists
 * so the markdown summary links a real image, not a 404.
 */
function resolveActualOutput(expected: string): string {
  if (existsSync(expected)) return expected;
  const base = expected.replace(/\.[^.]+$/i, '');
  for (const ext of ['.jpg', '.png', '.webp', '.jpeg']) {
    if (existsSync(base + ext)) return base + ext;
  }
  return expected; // fall back; caller still reports ok based on exit code
}

function slugify(text: string, maxLen = 40): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen) || 'compare';
}

function runGenerate(args: string[]): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolveFn) => {
    const proc = spawn('npx', ['-y', 'bun', GENERATE_SCRIPT, ...args], {
      stdio: ['ignore', 'inherit', 'pipe'],
      env: process.env,
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on('close', (code: number | null) => {
      resolveFn({ exitCode: code ?? 1, stderr });
    });
  });
}

function printUsage(): never {
  console.log(`
Model Comparison Script

Usage:
  npx -y bun compare-models.ts --prompt "..." --output-dir ./compare
  npx -y bun compare-models.ts --prompt-file prompt.md --output-dir ./compare

Options:
  -p, --prompt <text>           Prompt to compare across models
  -f, --prompt-file <path>      Read prompt from file
  -d, --output-dir <path>       Directory for output images (default: ./compare-output)
  --providers <list>            Comma-separated: openrouter,gemini,openai (default: all available)
  -a, --aspect-ratio <ratio>    Aspect ratio (default: 16:9 for landscape comparison)
  --openai-quality <q>          OpenAI quality: low / medium / high / auto (default: high)
  --openai-format <f>           OpenAI format: png / jpeg / webp (default: png)
  --slug <text>                 Filename slug (default: derived from prompt)
  -h, --help                    Show this help

Required env vars (only for the providers you include):
  OPENROUTER_API_KEY     for openrouter (Gemini 3 Pro Image / "banana-pro")
  GEMINI_API_KEY         for gemini direct
  OPENAI_API_KEY         for openai (gpt-image-2)

Output:
  <output-dir>/<slug>-<label>.png   one file per provider
  <output-dir>/<slug>-comparison.md  side-by-side summary
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  let prompt: string | null = null;
  let promptFile: string | null = null;
  let outputDir = './compare-output';
  let providersInput: string | null = null;
  let aspectRatio = '16:9';
  let openaiQuality = 'high';
  let openaiFormat = 'png';
  let slug: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        printUsage();
      case '-p':
      case '--prompt':
        prompt = args[++i];
        break;
      case '-f':
      case '--prompt-file':
        promptFile = args[++i];
        break;
      case '-d':
      case '--output-dir':
        outputDir = args[++i];
        break;
      case '--providers':
        providersInput = args[++i];
        break;
      case '-a':
      case '--aspect-ratio':
        aspectRatio = args[++i];
        break;
      case '--openai-quality':
        openaiQuality = args[++i];
        break;
      case '--openai-format':
        openaiFormat = args[++i];
        break;
      case '--slug':
        slug = args[++i];
        break;
    }
  }

  if (promptFile && !prompt) {
    prompt = await readFile(promptFile, 'utf-8');
  }
  if (!prompt) {
    console.error('Error: --prompt or --prompt-file is required');
    process.exit(1);
  }

  // Determine which providers to run
  const allProviders = ['openrouter', 'gemini', 'openai'] as const;
  type Provider = typeof allProviders[number];
  const requestedProviders: Provider[] = providersInput
    ? providersInput.split(',').map(s => s.trim()).filter((s): s is Provider => allProviders.includes(s as Provider))
    : allProviders.filter(p => {
        if (p === 'openrouter') return !!process.env.OPENROUTER_API_KEY;
        if (p === 'gemini') return !!process.env.GEMINI_API_KEY;
        if (p === 'openai') return !!process.env.OPENAI_API_KEY;
        return false;
      });

  if (requestedProviders.length === 0) {
    console.error('Error: No providers available. Set OPENROUTER_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY, or pass --providers');
    process.exit(1);
  }

  await mkdir(outputDir, { recursive: true });

  const finalSlug = slug || slugify(prompt.split('\n')[0] || 'compare');
  const runs: ProviderRun[] = [];

  console.log(`\n=== Model Comparison ===`);
  console.log(`Prompt: ${prompt.slice(0, 120)}${prompt.length > 120 ? '...' : ''}`);
  console.log(`Output dir: ${outputDir}`);
  console.log(`Aspect ratio: ${aspectRatio}`);
  console.log(`Providers: ${requestedProviders.join(', ')}\n`);

  for (const provider of requestedProviders) {
    const labelMap: Record<Provider, string> = {
      openrouter: 'banana-pro',
      gemini: 'gemini',
      openai: 'gpt-image-2',
    };
    const modelMap: Record<Provider, string> = {
      openrouter: 'google/gemini-3-pro-image-preview',
      gemini: 'gemini-3-pro-image-preview',
      openai: 'gpt-image-2',
    };
    const label = labelMap[provider];
    const model = modelMap[provider];
    // Output extension must match the format generate-image will actually write.
    // For openai the bytes follow --openai-format; other providers return PNG.
    const requestedExt = provider === 'openai' ? formatToExt(openaiFormat) : '.png';
    const outputFile = resolve(outputDir, `${finalSlug}-${label}${requestedExt}`);

    console.log(`\n--- Running ${label} (${provider}) ---`);

    const cliArgs = [
      '--prompt', prompt,
      '--output', outputFile,
      '--provider', provider,
      '--aspect-ratio', aspectRatio,
      '--no-config', // ensure no project config interference
    ];

    if (provider === 'openai') {
      cliArgs.push('--openai-quality', openaiQuality);
      cliArgs.push('--openai-format', openaiFormat);
    }

    const start = Date.now();
    const { exitCode, stderr } = await runGenerate(cliArgs);
    const durationMs = Date.now() - start;

    if (exitCode === 0) {
      // generate-image may have switched the extension (e.g. auto-compress → .jpg).
      // Resolve the file that actually landed on disk so the summary never links a 404.
      const actualFile = resolveActualOutput(outputFile);
      runs.push({ provider, label, model, outputFile: actualFile, durationMs, ok: true });
      console.log(`✓ ${label}: done in ${(durationMs / 1000).toFixed(1)}s`);
    } else {
      runs.push({ provider, label, model, outputFile, durationMs, ok: false, error: stderr.trim() });
      console.log(`✗ ${label}: failed (exit ${exitCode})`);
      if (stderr.trim()) console.log(`  ${stderr.trim().split('\n').slice(-3).join('\n  ')}`);
    }
  }

  // Write markdown summary
  const summaryPath = resolve(outputDir, `${finalSlug}-comparison.md`);
  const lines: string[] = [];
  lines.push(`# Model Comparison: ${finalSlug}`);
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push(`**Aspect ratio**: ${aspectRatio}`);
  lines.push('');
  lines.push('## Prompt');
  lines.push('');
  lines.push('```');
  lines.push(prompt);
  lines.push('```');
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| Provider | Model | Output | Duration | Status |');
  lines.push('|---|---|---|---|---|');
  for (const r of runs) {
    const filename = r.outputFile.split('/').pop() || r.outputFile;
    const dur = r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '-';
    const status = r.ok ? '✓ OK' : `✗ ${r.error?.split('\n')[0] || 'failed'}`;
    lines.push(`| ${r.label} | \`${r.model}\` | ${r.ok ? `![${r.label}](${filename})` : '-'} | ${dur} | ${status} |`);
  }
  lines.push('');
  lines.push('## Settings');
  lines.push('');
  if (requestedProviders.includes('openai')) {
    lines.push(`- OpenAI quality: \`${openaiQuality}\``);
    lines.push(`- OpenAI format: \`${openaiFormat}\``);
  }
  lines.push('');
  await writeFile(summaryPath, lines.join('\n'), 'utf-8');

  console.log(`\n=== Done ===`);
  console.log(`Summary: ${summaryPath}`);
  for (const r of runs) {
    if (r.ok) console.log(`  ${r.label}: ${r.outputFile}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
