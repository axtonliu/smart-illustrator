#!/usr/bin/env npx -y bun

/**
 * Mermaid Diagram Export Script
 *
 * Usage:
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/mermaid-export.ts --input diagram.mmd --output diagram.png
 *   npx -y bun ~/.claude/skills/smart-illustrator/scripts/mermaid-export.ts --input diagram.mmd --output diagram.png --theme dark
 *
 * Prerequisites:
 *   npm install -g @mermaid-js/mermaid-cli
 *
 * Themes:
 *   light  - Light style (neutral theme, white background)
 *   dark   - Dark tech style (dark theme, transparent background)
 */

import { spawn } from 'node:child_process';
import { access, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

interface ThemeConfig {
  theme: string;
  backgroundColor: string;
}

const THEMES: Record<string, ThemeConfig> = {
  light: {
    theme: 'neutral',
    backgroundColor: 'white'
  },
  dark: {
    theme: 'dark',
    backgroundColor: 'transparent'
  }
};

async function checkMermaidCli(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('mmdc', ['--version'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function exportMermaid(
  input: string,
  output: string,
  themeConfig: ThemeConfig,
  width?: number,
  height?: number
): Promise<void> {
  const args = [
    '-i', input,
    '-o', output,
    '-t', themeConfig.theme,
    '-b', themeConfig.backgroundColor
  ];

  if (width) {
    args.push('-w', width.toString());
  }
  if (height) {
    args.push('-H', height.toString());
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('mmdc', args, { stdio: 'inherit' });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mmdc exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run mmdc: ${err.message}`));
    });
  });
}

async function exportFromContent(
  content: string,
  output: string,
  themeConfig: ThemeConfig,
  width?: number,
  height?: number
): Promise<void> {
  // Create temp file for mermaid content
  const tempFile = resolve(tmpdir(), `mermaid-${Date.now()}.mmd`);

  try {
    await writeFile(tempFile, content, 'utf-8');
    await exportMermaid(tempFile, output, themeConfig, width, height);
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function printUsage(): never {
  console.log(`
Mermaid Diagram Export Script

Usage:
  npx -y bun mermaid-export.ts --input diagram.mmd --output diagram.png
  npx -y bun mermaid-export.ts --content "flowchart LR\\n  A-->B" --output diagram.png

Options:
  -i, --input <path>      Input .mmd file path
  -c, --content <text>    Mermaid diagram content (alternative to --input)
  -o, --output <path>     Output image path (default: output.png)
  -t, --theme <theme>     Theme: light (default) or dark
  -w, --width <pixels>    Image width
  -H, --height <pixels>   Image height
  -h, --help              Show this help

Themes:
  light   Neutral theme with white background (for content illustrations)
  dark    Dark theme with transparent background (for cover images)

Prerequisites:
  npm install -g @mermaid-js/mermaid-cli

Examples:
  # Export a flowchart
  npx -y bun mermaid-export.ts -i flowchart.mmd -o flowchart.png

  # Export with dark theme
  npx -y bun mermaid-export.ts -i diagram.mmd -o diagram.png -t dark

  # Export from inline content
  npx -y bun mermaid-export.ts -c "flowchart LR
    A[Start] --> B[End]" -o simple.png
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  let input: string | null = null;
  let content: string | null = null;
  let output = 'output.png';
  let theme = 'light';
  let width: number | undefined;
  let height: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        printUsage();
        break;
      case '-i':
      case '--input':
        input = args[++i];
        break;
      case '-c':
      case '--content':
        content = args[++i];
        break;
      case '-o':
      case '--output':
        output = args[++i];
        break;
      case '-t':
      case '--theme':
        theme = args[++i];
        break;
      case '-w':
      case '--width':
        width = parseInt(args[++i], 10);
        break;
      case '-H':
      case '--height':
        height = parseInt(args[++i], 10);
        break;
    }
  }

  // Check if mmdc is available
  const hasMmdc = await checkMermaidCli();
  if (!hasMmdc) {
    console.error('Error: mermaid-cli (mmdc) is not installed');
    console.error('Install it with: npm install -g @mermaid-js/mermaid-cli');
    process.exit(1);
  }

  // Validate theme
  const themeConfig = THEMES[theme];
  if (!themeConfig) {
    console.error(`Error: Invalid theme "${theme}". Use "light" or "dark".`);
    process.exit(1);
  }

  // Get mermaid content
  if (input) {
    try {
      await access(input);
    } catch {
      console.error(`Error: Input file not found: ${input}`);
      process.exit(1);
    }
  } else if (!content) {
    console.error('Error: --input or --content is required');
    process.exit(1);
  }

  // Ensure output directory exists
  await mkdir(dirname(output), { recursive: true });

  console.log(`Exporting Mermaid diagram...`);
  console.log(`Theme: ${theme} (${themeConfig.theme}, bg: ${themeConfig.backgroundColor})`);

  try {
    if (input) {
      await exportMermaid(input, output, themeConfig, width, height);
    } else if (content) {
      await exportFromContent(content, output, themeConfig, width, height);
    }

    console.log(`Diagram exported to: ${output}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
